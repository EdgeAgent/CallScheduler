import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function QuickCallPanel() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [voice, setVoice] = useState("sarah");
  const [purpose, setPurpose] = useState("lead_generation");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const initiateCallMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/calls/initiate", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Call Initiated",
        description: "The call has been started successfully.",
      });
      setPhoneNumber("");
      setContactName("");
      queryClient.invalidateQueries({ queryKey: ['/api/calls/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Call Failed",
        description: error.message || "Failed to initiate the call.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a phone number to call.",
        variant: "destructive",
      });
      return;
    }

    initiateCallMutation.mutate({
      phoneNumber,
      contactName: contactName || null,
      purpose,
      voice,
    });
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Quick Call</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              data-testid="input-phone-number"
            />
          </div>
          
          <div>
            <Label htmlFor="contactName">Contact Name (Optional)</Label>
            <Input
              id="contactName"
              type="text"
              placeholder="John Doe"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              data-testid="input-contact-name"
            />
          </div>
          
          <div>
            <Label htmlFor="voice">Voice Selection</Label>
            <Select value={voice} onValueChange={setVoice}>
              <SelectTrigger data-testid="select-voice">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sarah">Sarah - Professional Female</SelectItem>
                <SelectItem value="david">David - Warm Male</SelectItem>
                <SelectItem value="emma">Emma - Energetic Female</SelectItem>
                <SelectItem value="michael">Michael - Authoritative Male</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="purpose">Call Purpose</Label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger data-testid="select-purpose">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead_generation">Lead Generation</SelectItem>
                <SelectItem value="appointment_booking">Appointment Booking</SelectItem>
                <SelectItem value="follow_up">Follow-up Call</SelectItem>
                <SelectItem value="survey">Survey Collection</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={initiateCallMutation.isPending}
            data-testid="button-start-call"
          >
            <Phone className="mr-2 h-4 w-4" />
            {initiateCallMutation.isPending ? "Starting Call..." : "Start Call"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
