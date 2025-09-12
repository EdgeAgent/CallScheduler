import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, Key, Phone, Brain, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function Settings() {
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [defaultVoice, setDefaultVoice] = useState("sarah");
  const [speakingSpeed, setSpeakingSpeed] = useState("normal");
  const [aiModel, setAiModel] = useState("gpt-5");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current configuration
  const { data: config, isLoading } = useQuery({
    queryKey: ['/api/configuration'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Load configuration data when it arrives
  useEffect(() => {
    if (config) {
      setDefaultVoice((config as any).defaultVoice || 'sarah');
      setSpeakingSpeed((config as any).speakingSpeed || 'normal');
      setAiModel((config as any).aiModel || 'gpt-5');
      // Note: API credentials are masked, so we don't load them
    }
  }, [config]);

  const updateConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", "/api/configuration", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Your API configuration has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/configuration'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update configuration.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const updates: any = {
      defaultVoice,
      speakingSpeed,
      aiModel,
    };

    // Only include API credentials if they're provided
    if (twilioAccountSid.trim()) updates.twilioAccountSid = twilioAccountSid.trim();
    if (twilioAuthToken.trim()) updates.twilioAuthToken = twilioAuthToken.trim();
    if (twilioPhoneNumber.trim()) updates.twilioPhoneNumber = twilioPhoneNumber.trim();
    if (openaiApiKey.trim()) updates.openaiApiKey = openaiApiKey.trim();

    updateConfigMutation.mutate(updates);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
          <div>Loading configuration...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        
        <p className="text-muted-foreground">
          Configure your API credentials and system preferences. Your API keys are securely stored and never exposed in the frontend.
        </p>

        <div className="grid gap-6">
          {/* Twilio Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Twilio Configuration
              </CardTitle>
              <CardDescription>
                Configure your Twilio credentials for making phone calls. You can get these from your Twilio Console.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="twilio-account-sid">Account SID</Label>
                <Input
                  id="twilio-account-sid"
                  type="text"
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={twilioAccountSid}
                  onChange={(e) => setTwilioAccountSid(e.target.value)}
                  data-testid="input-twilio-account-sid"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {(config as any)?.twilioAccountSid ? "Currently configured (hidden)" : "Not configured"}
                </p>
              </div>
              
              <div>
                <Label htmlFor="twilio-auth-token">Auth Token</Label>
                <Input
                  id="twilio-auth-token"
                  type="password"
                  placeholder="Your Twilio Auth Token"
                  value={twilioAuthToken}
                  onChange={(e) => setTwilioAuthToken(e.target.value)}
                  data-testid="input-twilio-auth-token"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {(config as any)?.twilioAuthToken ? "Currently configured (hidden)" : "Not configured"}
                </p>
              </div>
              
              <div>
                <Label htmlFor="twilio-phone-number">Phone Number</Label>
                <Input
                  id="twilio-phone-number"
                  type="tel"
                  placeholder="+1234567890"
                  value={twilioPhoneNumber}
                  onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                  data-testid="input-twilio-phone-number"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Your Twilio phone number in E.164 format (e.g., +1234567890)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* OpenAI Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                OpenAI Configuration
              </CardTitle>
              <CardDescription>
                Configure your OpenAI API key for AI-powered conversations. You can get this from your OpenAI account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="openai-api-key">API Key</Label>
                <Input
                  id="openai-api-key"
                  type="password"
                  placeholder="sk-..."
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  data-testid="input-openai-api-key"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {(config as any)?.openaiApiKey ? "Currently configured (hidden)" : "Not configured"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Separator className="" />

          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>
                Configure default voice settings and AI model preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="default-voice">Default Voice</Label>
                <Select value={defaultVoice} onValueChange={setDefaultVoice}>
                  <SelectTrigger data-testid="select-default-voice">
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
                <Label htmlFor="speaking-speed">Speaking Speed</Label>
                <Select value={speakingSpeed} onValueChange={setSpeakingSpeed}>
                  <SelectTrigger data-testid="select-speaking-speed">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Slow</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="fast">Fast</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="ai-model">AI Model</Label>
                <Select value={aiModel} onValueChange={setAiModel}>
                  <SelectTrigger data-testid="select-ai-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-5">GPT-5 (Latest)</SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={handleSave}
                disabled={updateConfigMutation.isPending}
                className="w-full"
                data-testid="button-save-settings"
              >
                <Save className="mr-2 h-4 w-4" />
                {updateConfigMutation.isPending ? "Saving..." : "Save Configuration"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}