import twilio from 'twilio';

export class TwilioService {
  private client: twilio.Twilio | null = null;
  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER || '';
    
    if (this.accountSid && this.authToken) {
      this.client = twilio(this.accountSid, this.authToken);
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async makeCall(to: string, webhookUrl: string): Promise<string> {
    if (!this.client) {
      throw new Error('Twilio is not configured');
    }

    try {
      const call = await this.client.calls.create({
        to: to,
        from: this.phoneNumber,
        url: webhookUrl,
        record: true,
        statusCallback: webhookUrl.replace('/voice', '/status'),
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      });

      return call.sid;
    } catch (error: any) {
      throw new Error(`Failed to make call: ${error.message}`);
    }
  }

  async endCall(callSid: string): Promise<void> {
    if (!this.client) {
      throw new Error('Twilio is not configured');
    }

    try {
      await this.client.calls(callSid).update({
        status: 'completed'
      });
    } catch (error: any) {
      throw new Error(`Failed to end call: ${error.message}`);
    }
  }

  async getCallDetails(callSid: string): Promise<any> {
    if (!this.client) {
      throw new Error('Twilio is not configured');
    }

    try {
      const call = await this.client.calls(callSid).fetch();
      return {
        sid: call.sid,
        status: call.status,
        duration: call.duration,
        direction: call.direction,
        from: call.from,
        to: call.to,
        startTime: call.startTime,
        endTime: call.endTime,
      };
    } catch (error: any) {
      throw new Error(`Failed to get call details: ${error.message}`);
    }
  }

  generateTwiML(message: string, callId?: string, voiceOptions?: any): string {
    const twiml = new twilio.twiml.VoiceResponse();
    const voice = voiceOptions || { voice: 'alice', language: 'en-US' };
    
    if (message) {
      twiml.say(voice, message);
    }

    // Always gather user input for conversation flow
    const gather = twiml.gather({
      input: ['speech'] as any,
      timeout: 10,
      speechTimeout: 'auto',
      action: callId ? `/api/calls/speech/${callId}` : '/api/calls/speech',
      method: 'POST'
    });
    
    gather.say(voice, 'Please respond when ready.');
    
    // Add fallback if no speech is detected
    twiml.say(voice, 'I didn\'t hear anything. Goodbye!');

    return twiml.toString();
  }

  generateVoiceOptions(voice: string): any {
    const voiceMap: Record<string, any> = {
      'sarah': { voice: 'alice', language: 'en-US' },
      'david': { voice: 'man', language: 'en-US' },
      'emma': { voice: 'alice', language: 'en-GB' },
      'michael': { voice: 'man', language: 'en-GB' }
    };

    return voiceMap[voice] || voiceMap['sarah'];
  }
}

export const twilioService = new TwilioService();
