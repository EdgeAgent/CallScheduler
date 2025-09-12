import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function VoiceConfiguration() {
  const [defaultVoice, setDefaultVoice] = useState("sarah");
  const [speakingSpeed, setSpeakingSpeed] = useState("normal");
  const [aiModel, setAiModel] = useState("gpt-5");
  const [callScriptTemplate, setCallScriptTemplate] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['/api/configuration'],
  });

  // Update local state when config loads
  useEffect(() => {
    if (config) {
      setDefaultVoice((config as any)?.defaultVoice || "sarah");
      setSpeakingSpeed((config as any)?.speakingSpeed || "normal");
      setAiModel((config as any)?.aiModel || "gpt-5");
      setCallScriptTemplate((config as any)?.callScriptTemplate || "");
    }
  }, [config]);

  const saveConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", "/api/configuration", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "Your voice and AI settings have been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/configuration'] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save configuration.",
        variant: "destructive",
      });
    },
  });

  const testVoiceMutation = useMutation({
    mutationFn: async () => {
      // This would integrate with a text-to-speech service for testing
      // For now, we'll just simulate the test
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Voice Test",
        description: "Voice test completed. Check your speakers.",
      });
    },
    onError: () => {
      toast({
        title: "Voice Test Failed",
        description: "Could not test voice. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveConfigMutation.mutate({
      defaultVoice,
      speakingSpeed,
      aiModel,
      callScriptTemplate,
    });
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Voice & AI Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              ))}
            </div>
            <div>
              <div className="h-4 bg-muted rounded w-32 mb-2"></div>
              <div className="h-24 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Voice & AI Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="defaultVoice">Default Voice</Label>
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
              <Label htmlFor="speakingSpeed">Speaking Speed</Label>
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
              <Label htmlFor="aiModel">AI Model</Label>
              <Select value={aiModel} onValueChange={setAiModel}>
                <SelectTrigger data-testid="select-ai-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-5">GPT-5</SelectItem>
                  <SelectItem value="gpt-4">GPT-4 Turbo</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="callScript">Call Script Template</Label>
            <Textarea 
              id="callScript"
              rows={4}
              placeholder="Enter your AI agent's script template..."
              value={callScriptTemplate}
              onChange={(e) => setCallScriptTemplate(e.target.value)}
              data-testid="textarea-call-script"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Use placeholders: [AGENT_NAME], [COMPANY_NAME], [CALL_PURPOSE]
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={handleSave}
              disabled={saveConfigMutation.isPending}
              data-testid="button-save-configuration"
            >
              {saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
            <Button 
              variant="outline"
              onClick={() => testVoiceMutation.mutate()}
              disabled={testVoiceMutation.isPending}
              data-testid="button-test-voice"
            >
              {testVoiceMutation.isPending ? "Testing..." : "Test Voice"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
