import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "default_key" 
});

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface CallContext {
  contactName?: string;
  phoneNumber: string;
  purpose: string;
  callScript: string;
  previousMessages: ConversationMessage[];
}

export class OpenAIService {
  async generateCallResponse(context: CallContext, userInput: string): Promise<{
    response: string;
    intent: 'continue' | 'schedule' | 'end' | 'transfer';
    appointmentDetails?: {
      preferredDate?: string;
      preferredTime?: string;
      notes?: string;
    };
  }> {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...context.previousMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user' as const, content: userInput }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages,
        response_format: { type: "json_object" },
        max_tokens: 500,
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        response: result.response || "I understand. Let me help you with that.",
        intent: result.intent || 'continue',
        appointmentDetails: result.appointmentDetails
      };
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      return {
        response: "I apologize, but I'm having trouble processing that. Could you please repeat?",
        intent: 'continue'
      };
    }
  }

  private buildSystemPrompt(context: CallContext): string {
    return `
You are an AI phone agent making outreach calls. Your goal is to have natural conversations and potentially schedule appointments.

Context:
- Contact: ${context.contactName || 'Prospect'}
- Phone: ${context.phoneNumber}
- Purpose: ${context.purpose}
- Script template: ${context.callScript}

Instructions:
1. Be natural, friendly, and professional
2. Listen carefully to responses and adapt accordingly
3. If the person shows interest, try to schedule an appointment
4. If they're not interested, politely end the call
5. If they want to be called back later, note that
6. Always respond with valid JSON in this format:

{
  "response": "Your natural response to continue the conversation",
  "intent": "continue|schedule|end|transfer",
  "appointmentDetails": {
    "preferredDate": "if mentioned, date preference",
    "preferredTime": "if mentioned, time preference", 
    "notes": "any additional notes about scheduling"
  }
}

Keep responses conversational and under 50 words. Focus on building rapport and understanding their needs.
`;
  }

  async analyzeCallOutcome(conversation: ConversationMessage[]): Promise<{
    outcome: 'appointment_booked' | 'callback_requested' | 'not_interested' | 'no_answer' | 'voicemail';
    summary: string;
    nextAction?: string;
  }> {
    try {
      const conversationText = conversation
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: 'system',
            content: `Analyze this phone call conversation and determine the outcome. Respond with JSON in this format:
{
  "outcome": "appointment_booked|callback_requested|not_interested|no_answer|voicemail",
  "summary": "Brief summary of what happened in the call",
  "nextAction": "Recommended next action if any"
}`
          },
          {
            role: 'user',
            content: conversationText
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
      });

      return JSON.parse(response.choices[0].message.content || '{"outcome": "no_answer", "summary": "Call analysis failed"}');
    } catch (error: any) {
      console.error('Call analysis error:', error);
      return {
        outcome: 'no_answer',
        summary: 'Unable to analyze call outcome',
      };
    }
  }
}

export const openaiService = new OpenAIService();
