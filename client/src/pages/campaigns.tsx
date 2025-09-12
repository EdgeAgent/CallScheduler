import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit, Plus, Play, Pause, Users, Phone, Calendar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { insertCampaignSchema } from '@shared/schema';
import { z } from 'zod';

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  script: string;
  voice: string | null;
  contactIds: string[] | null;
  totalContacts: number | null;
  callsMade: number | null;
  successfulCalls: number | null;
  appointmentsBooked: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

const campaignFormSchema = insertCampaignSchema.extend({
  name: z.string().min(1, 'Campaign name is required'),
  script: z.string().min(1, 'Script is required'),
});

type CampaignFormData = z.infer<typeof campaignFormSchema>;

export default function Campaigns() {
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const { toast } = useToast();

  const campaignsQuery = useQuery({
    queryKey: ['/api/campaigns'],
  });

  const campaignForm = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: '',
      description: '',
      script: '',
      status: 'draft',
      voice: 'sarah',
      contactIds: [],
      totalContacts: 0,
      callsMade: 0,
      successfulCalls: 0,
      appointmentsBooked: 0,
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const response = await apiRequest('POST', '/api/campaigns', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      setShowCampaignDialog(false);
      campaignForm.reset();
      toast({ title: 'Campaign created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to create campaign', description: error.message, variant: 'destructive' });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CampaignFormData> }) => {
      const response = await apiRequest('PUT', `/api/campaigns/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      setShowCampaignDialog(false);
      setEditingCampaign(null);
      campaignForm.reset();
      toast({ title: 'Campaign updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update campaign', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/campaigns/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      toast({ title: 'Campaign deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to delete campaign', description: error.message, variant: 'destructive' });
    },
  });

  const onCampaignSubmit = (data: CampaignFormData) => {
    if (editingCampaign) {
      updateCampaignMutation.mutate({ id: editingCampaign.id, data });
    } else {
      createCampaignMutation.mutate(data);
    }
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    campaignForm.reset({
      name: campaign.name,
      description: campaign.description || '',
      script: campaign.script,
      status: campaign.status,
      voice: campaign.voice || 'sarah',
      contactIds: campaign.contactIds || [],
      totalContacts: campaign.totalContacts || 0,
      callsMade: campaign.callsMade || 0,
      successfulCalls: campaign.successfulCalls || 0,
      appointmentsBooked: campaign.appointmentsBooked || 0,
    });
    setShowCampaignDialog(true);
  };

  const handleNewCampaign = () => {
    setEditingCampaign(null);
    campaignForm.reset({
      name: '',
      description: '',
      script: '',
      status: 'draft',
      voice: 'sarah',
      contactIds: [],
      totalContacts: 0,
      callsMade: 0,
      successfulCalls: 0,
      appointmentsBooked: 0,
    });
    setShowCampaignDialog(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'paused':
        return 'secondary';
      case 'completed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const campaigns = (campaignsQuery.data as Campaign[]) || [];

  if (campaignsQuery.isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Campaigns</h1>
        <div className="text-center py-8">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">Manage your outreach campaigns</p>
        </div>
        <Button onClick={handleNewCampaign} data-testid="button-new-campaign">
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Phone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
            <p className="text-muted-foreground mb-4">Create your first campaign to start reaching out to contacts</p>
            <Button onClick={handleNewCampaign} data-testid="button-create-first-campaign">
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign: Campaign) => (
            <Card key={campaign.id} data-testid={`card-campaign-${campaign.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(campaign.status)}>
                        {campaign.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {campaign.voice || 'sarah'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCampaign(campaign)}
                      data-testid={`button-edit-campaign-${campaign.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                      data-testid={`button-delete-campaign-${campaign.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {campaign.description && (
                  <CardDescription>{campaign.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{campaign.totalContacts || 0} contacts</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{campaign.callsMade || 0} calls</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{campaign.appointmentsBooked || 0} booked</span>
                  </div>
                  <div className="text-muted-foreground">
                    {campaign.successfulCalls || 0} successful
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent className="max-w-2xl" data-testid="dialog-campaign">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
            </DialogTitle>
            <DialogDescription>
              {editingCampaign 
                ? 'Update campaign details and settings'
                : 'Set up a new outreach campaign with your script and settings'
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...campaignForm}>
            <form onSubmit={campaignForm.handleSubmit(onCampaignSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={campaignForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Q4 Outreach Campaign" data-testid="input-campaign-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={campaignForm.control}
                  name="voice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voice</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || 'sarah'}>
                        <FormControl>
                          <SelectTrigger data-testid="select-campaign-voice">
                            <SelectValue placeholder="Select voice" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sarah">Sarah</SelectItem>
                          <SelectItem value="mike">Mike</SelectItem>
                          <SelectItem value="jenny">Jenny</SelectItem>
                          <SelectItem value="david">David</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={campaignForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Brief description of this campaign..." 
                        data-testid="input-campaign-description" 
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={campaignForm.control}
                name="script"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Call Script</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Hi, this is [AGENT_NAME] calling from [COMPANY_NAME]. I'm reaching out regarding [CALL_PURPOSE]. Do you have a few minutes to talk?"
                        className="min-h-[100px]"
                        data-testid="textarea-campaign-script"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={campaignForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-campaign-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCampaignDialog(false)}
                  data-testid="button-cancel-campaign"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCampaignMutation.isPending || updateCampaignMutation.isPending}
                  data-testid="button-save-campaign"
                >
                  {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}