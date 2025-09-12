import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, Clock, Phone, User, Trash2, Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { insertAppointmentSchema, insertContactSchema, type Appointment, type Contact } from '@shared/schema';
import { z } from 'zod';

// Form schemas
const appointmentFormSchema = insertAppointmentSchema.extend({
  scheduledTime: z.string().min(1, 'Scheduled time is required'),
});

const contactFormSchema = insertContactSchema.extend({
  phoneNumber: z.string().min(1, 'Phone number is required'),
});

type AppointmentFormData = z.infer<typeof appointmentFormSchema>;
type ContactFormData = z.infer<typeof contactFormSchema>;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function CalendarGrid({ year, month, appointments, onDateClick }: {
  year: number;
  month: number;
  appointments: Appointment[];
  onDateClick: (date: Date) => void;
}) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const days = [];
  const currentDate = new Date(startDate);

  for (let i = 0; i < 42; i++) {
    const isCurrentMonth = currentDate.getMonth() === month;
    const isToday = currentDate.toDateString() === new Date().toDateString();
    
    const dayAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.scheduledTime);
      return aptDate.getDate() === currentDate.getDate() &&
             aptDate.getMonth() === currentDate.getMonth() &&
             aptDate.getFullYear() === currentDate.getFullYear();
    });

    days.push(
      <div
        key={i}
        onClick={() => isCurrentMonth && onDateClick(new Date(currentDate))}
        className={`
          min-h-[100px] p-2 border border-border cursor-pointer hover:bg-accent transition-colors
          ${!isCurrentMonth ? 'bg-muted text-muted-foreground' : ''}
          ${isToday ? 'ring-2 ring-primary' : ''}
        `}
        data-testid={`calendar-day-${currentDate.getDate()}`}
      >
        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
          {currentDate.getDate()}
        </div>
        <div className="space-y-1">
          {dayAppointments.map(apt => (
            <div
              key={apt.id}
              className="text-xs p-1 bg-primary/10 text-primary rounded border-l-2 border-primary truncate"
              data-testid={`appointment-${apt.id}`}
            >
              <div className="font-medium">{new Date(apt.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              <div className="truncate">{apt.contactName}</div>
            </div>
          ))}
        </div>
      </div>
    );

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return (
    <div className="grid grid-cols-7 gap-0 border border-border rounded-lg overflow-hidden">
      {DAYS.map(day => (
        <div key={day} className="p-3 bg-muted font-medium text-center text-sm">
          {day}
        </div>
      ))}
      {days}
    </div>
  );
}

export function Calendar() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { data: appointments = [] } = useQuery({
    queryKey: ['/api/appointments/month', year, month],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/appointments/month/${year}/${month}`);
      return response.json();
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['/api/contacts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/contacts');
      return response.json();
    },
  });

  const appointmentForm = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      contactName: '',
      phoneNumber: '',
      scheduledTime: '',
      status: 'scheduled',
      purpose: '',
      notes: '',
      contactId: undefined,
    },
  });

  const contactForm = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      phoneNumber: '',
      email: '',
      notes: '',
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/appointments', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/month'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      setShowAppointmentDialog(false);
      appointmentForm.reset();
      toast({ title: 'Appointment created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to create appointment', description: error.message, variant: 'destructive' });
    },
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const response = await apiRequest('POST', '/api/contacts', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      setShowContactDialog(false);
      contactForm.reset();
      toast({ title: 'Contact created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to create contact', description: error.message, variant: 'destructive' });
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/appointments/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/month'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({ title: 'Appointment deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to delete appointment', description: error.message, variant: 'destructive' });
    },
  });

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const isoString = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0).toISOString();
    appointmentForm.setValue('scheduledTime', isoString.slice(0, 16));
    setShowAppointmentDialog(true);
  };

  const onAppointmentSubmit = (data: AppointmentFormData) => {
    const appointmentData = {
      contactName: data.contactName,
      phoneNumber: data.phoneNumber || undefined,
      scheduledTime: new Date(data.scheduledTime).toISOString(),
      status: data.status,
      purpose: data.purpose || undefined,
      notes: data.notes || undefined,
      contactId: data.contactId || undefined,
    };
    createAppointmentMutation.mutate(appointmentData);
  };

  const onContactSubmit = (data: ContactFormData) => {
    createContactMutation.mutate(data);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Calendar & Scheduling</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-contact">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
              </DialogHeader>
              <Form {...contactForm}>
                <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="space-y-4">
                  <FormField
                    control={contactForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-contact-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={contactForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+1234567890" data-testid="input-contact-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={contactForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" data-testid="input-contact-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={contactForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-contact-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={createContactMutation.isPending} data-testid="button-save-contact">
                    {createContactMutation.isPending ? 'Creating...' : 'Create Contact'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Button data-testid="button-today" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  {MONTHS[month]} {year}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')} data-testid="button-prev-month">
                    ← Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('next')} data-testid="button-next-month">
                    Next →
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CalendarGrid
                year={year}
                month={month}
                appointments={appointments}
                onDateClick={handleDateClick}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Today's Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {appointments
                  .filter(apt => {
                    const aptDate = new Date(apt.scheduledTime);
                    const today = new Date();
                    return aptDate.toDateString() === today.toDateString();
                  })
                  .map(apt => (
                    <div key={apt.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium text-sm">{apt.contactName}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(apt.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAppointmentMutation.mutate(apt.id)}
                        data-testid={`button-delete-appointment-${apt.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recent Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {contacts.slice(0, 5).map((contact: Contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium text-sm">{contact.name}</div>
                      <div className="text-xs text-muted-foreground">{contact.phoneNumber}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showAppointmentDialog} onOpenChange={setShowAppointmentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Appointment</DialogTitle>
          </DialogHeader>
          <Form {...appointmentForm}>
            <form onSubmit={appointmentForm.handleSubmit(onAppointmentSubmit)} className="space-y-4">
              <FormField
                control={appointmentForm.control}
                name="contactId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-contact">
                          <SelectValue placeholder="Select existing contact" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contacts.map((contact: Contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.name} - {contact.phoneNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={appointmentForm.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-appointment-contact-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={appointmentForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+1234567890" data-testid="input-appointment-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={appointmentForm.control}
                name="scheduledTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date & Time</FormLabel>
                    <FormControl>
                      <Input {...field} type="datetime-local" data-testid="input-appointment-datetime" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={appointmentForm.control}
                name="purpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purpose (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Consultation, Follow-up" data-testid="input-appointment-purpose" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={appointmentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-appointment-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" disabled={createAppointmentMutation.isPending} data-testid="button-save-appointment">
                {createAppointmentMutation.isPending ? 'Scheduling...' : 'Schedule Appointment'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}