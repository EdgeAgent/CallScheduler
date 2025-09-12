import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "default_key" 
});

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sentiment?: 'positive' | 'negative' | 'neutral';
  confidence?: number;
}

export interface CallContext {
  contactName?: string;
  phoneNumber: string;
  purpose: string;
  callScript: string;
  previousMessages: ConversationMessage[];
  contactInfo?: {
    businessType?: string;
    previousInteractions?: string;
    preferredContactTime?: string;
    notes?: string;
  };
  callObjectives?: string[];
  conversationStage?: 'opening' | 'discovery' | 'presentation' | 'handling_objections' | 'closing' | 'scheduling';
}

export class OpenAIService {
  async generateCallResponse(context: CallContext, userInput: string): Promise<{
    response: string;
    intent: 'continue' | 'schedule' | 'end' | 'transfer' | 'gather_info' | 'handle_objection' | 'clarify' | 'reschedule';
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    nextStage?: 'opening' | 'discovery' | 'presentation' | 'handling_objections' | 'closing' | 'scheduling';
    appointmentDetails?: {
      preferredDate?: string;
      preferredTime?: string;
      notes?: string;
      type?: string;
      duration?: string;
    };
    followUp?: {
      action: string;
      timeframe: string;
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
        sentiment: result.sentiment || 'neutral',
        confidence: result.confidence || 0.7,
        nextStage: result.nextStage,
        appointmentDetails: result.appointmentDetails,
        followUp: result.followUp
      };
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      return {
        response: "I apologize, but I'm having trouble processing that. Could you please repeat?",
        intent: 'continue',
        sentiment: 'neutral',
        confidence: 0.5
      };
    }
  }

  private buildSystemPrompt(context: CallContext): string {
    const stage = context.conversationStage || 'opening';
    const businessContext = context.contactInfo?.businessType ? `Business type: ${context.contactInfo.businessType}` : '';
    const previousNotes = context.contactInfo?.notes ? `Previous notes: ${context.contactInfo.notes}` : '';
    
    return `
You are an expert AI phone agent with advanced emotional intelligence and conversation skills. Your mission is to understand user intent deeply and respond with empathy and precision.

CONTEXT:
- Contact: ${context.contactName || 'Prospect'}
- Phone: ${context.phoneNumber}
- Purpose: ${context.purpose}
- Conversation Stage: ${stage}
- ${businessContext}
- ${previousNotes}

ADVANCED INTENT RECOGNITION:
Analyze every response for:
1. Emotional state (excited, hesitant, busy, frustrated, curious)
2. Interest level (high, medium, low, negative)
3. Hidden objections or concerns
4. Time sensitivity and urgency
5. Decision-making authority
6. Preferred communication style

CONVERSATION STAGES & STRATEGIES:
- Opening: Build rapport, confirm identity, state purpose clearly
- Discovery: Ask open questions, listen for pain points, understand needs
- Presentation: Tailor benefits to their specific situation
- Handling Objections: Address concerns with empathy and evidence
- Closing: Create urgency, ask for commitment
- Scheduling: Be flexible, offer multiple options, confirm details

ADVANCED RESPONSE GUIDELINES:
1. Mirror their communication style (formal/casual, pace, vocabulary)
2. Use active listening techniques ("What I'm hearing is...")
3. Address unspoken concerns proactively
4. Use social proof and urgency when appropriate
5. Ask permission before transitioning ("Would it be helpful if I...")
6. Acknowledge their time and respect their schedule

INTENT CLASSIFICATION:
- continue: Keep conversation flowing naturally
- gather_info: Need more information before proceeding
- handle_objection: Address specific concern or resistance
- clarify: Need clarification on what they said
- schedule: Ready to book an appointment
- reschedule: Want to schedule for later time
- transfer: Need human agent or specialist
- end: Conversation should end (politely)

EXAMPLE RESPONSES:
User: "I'm really busy right now"
Response: "I completely understand - time is valuable. Would a quick 30-second overview help you decide if this is worth a longer conversation later?"

User: "We tried something like this before and it didn't work"
Response: "That's frustrating, and I appreciate you sharing that. What specifically didn't work? Understanding that helps me explain how our approach is different."

REQUIRED JSON FORMAT:
{
  "response": "Natural, empathetic response (under 60 words)",
  "intent": "continue|gather_info|handle_objection|clarify|schedule|reschedule|transfer|end",
  "sentiment": "positive|negative|neutral",
  "confidence": 0.1-1.0,
  "nextStage": "opening|discovery|presentation|handling_objections|closing|scheduling",
  "appointmentDetails": {
    "preferredDate": "date if mentioned",
    "preferredTime": "time if mentioned",
    "type": "meeting type if specified",
    "duration": "expected duration",
    "notes": "any specific requirements"
  },
  "followUp": {
    "action": "what to do next",
    "timeframe": "when to follow up",
    "notes": "additional context"
  }
}

Focus on understanding the REAL intent behind their words, not just surface meaning.
`;
  }

  async analyzeCallOutcome(conversation: ConversationMessage[]): Promise<{
    outcome: 'appointment_booked' | 'callback_requested' | 'not_interested' | 'no_answer' | 'voicemail';
    summary: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    keyInsights: string[];
    objections: string[];
    nextAction?: string;
    followUpStrategy?: string;
    customerProfile?: {
      decisionMaker: boolean;
      budget: 'low' | 'medium' | 'high' | 'unknown';
      timeline: 'immediate' | 'short' | 'long' | 'unknown';
      painPoints: string[];
    };
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
            content: `Analyze this phone call conversation comprehensively. Look for emotional cues, hidden objections, pain points, and decision-making patterns. Respond with JSON in this format:
{
  "outcome": "appointment_booked|callback_requested|not_interested|no_answer|voicemail",
  "summary": "Brief summary of what happened in the call",
  "sentiment": "positive|negative|neutral",
  "keyInsights": ["Key insight 1", "Key insight 2"],
  "objections": ["Objection 1", "Objection 2"],
  "nextAction": "Recommended next action",
  "followUpStrategy": "How to approach follow-up",
  "customerProfile": {
    "decisionMaker": true/false,
    "budget": "low|medium|high|unknown",
    "timeline": "immediate|short|long|unknown",
    "painPoints": ["Pain point 1", "Pain point 2"]
  }
}`
          },
          {
            role: 'user',
            content: conversationText
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        outcome: result.outcome || 'no_answer',
        summary: result.summary || 'Call analysis failed',
        sentiment: result.sentiment || 'neutral',
        keyInsights: result.keyInsights || [],
        objections: result.objections || [],
        nextAction: result.nextAction,
        followUpStrategy: result.followUpStrategy,
        customerProfile: result.customerProfile
      };
    } catch (error: any) {
      console.error('Call analysis error:', error);
      return {
        outcome: 'no_answer',
        summary: 'Unable to analyze call outcome',
        sentiment: 'neutral',
        keyInsights: [],
        objections: [],
      };
    }
  }

  // Advanced conversation context management
  async updateConversationContext(
    context: CallContext, 
    newMessage: ConversationMessage,
    aiResponse: any
  ): Promise<CallContext> {
    // Update conversation stage based on AI response
    const updatedContext: CallContext = {
      ...context,
      conversationStage: aiResponse.nextStage || context.conversationStage,
      previousMessages: [...context.previousMessages, newMessage]
    };

    // Add sentiment tracking to message
    newMessage.sentiment = aiResponse.sentiment;
    newMessage.confidence = aiResponse.confidence;

    return updatedContext;
  }

  // Generate personalized conversation starters based on contact info
  async generatePersonalizedOpener(context: CallContext): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: 'system',
            content: `Create a personalized, natural phone call opener. Be warm, professional, and reference specific context when appropriate.

Context:
- Contact: ${context.contactName || 'Prospect'}
- Business: ${context.contactInfo?.businessType || 'Unknown'}
- Purpose: ${context.purpose}
- Previous notes: ${context.contactInfo?.notes || 'None'}

Guidelines:
1. Use their name naturally
2. Be specific about why you're calling
3. Reference any previous interactions if mentioned
4. Create immediate value or curiosity
5. Ask permission to continue ("Is now a good time?")
6. Keep it under 40 words

Respond with just the opener text, no JSON.`
          }
        ],
        max_tokens: 100,
        temperature: 0.8,
      });

      return response.choices[0].message.content || "Hi there! I hope you're having a great day. I'm calling about an opportunity that might interest you. Is now a good time to chat for just a minute?";
    } catch (error: any) {
      console.error('Opener generation error:', error);
      return "Hi there! I hope you're having a great day. I'm calling about an opportunity that might interest you. Is now a good time to chat for just a minute?";
    }
  }

  // Predict conversation outcome and suggest next best actions
  async predictConversationFlow(context: CallContext): Promise<{
    nextBestActions: string[];
    outcomeConfidence: number;
    recommendedStage: string;
    riskFactors: string[];
    opportunities: string[];
  }> {
    try {
      const conversationHistory = context.previousMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: 'system',
            content: `Analyze this conversation and predict the best next moves. Consider emotional state, objections, interest level, and conversation patterns.

Current stage: ${context.conversationStage}
Conversation so far:
${conversationHistory}

Respond with JSON:
{
  "nextBestActions": ["Action 1", "Action 2", "Action 3"],
  "outcomeConfidence": 0.0-1.0,
  "recommendedStage": "stage_name",
  "riskFactors": ["Risk 1", "Risk 2"],
  "opportunities": ["Opportunity 1", "Opportunity 2"]
}`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 400,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        nextBestActions: result.nextBestActions || ["Continue conversation naturally"],
        outcomeConfidence: result.outcomeConfidence || 0.5,
        recommendedStage: result.recommendedStage || context.conversationStage || 'discovery',
        riskFactors: result.riskFactors || [],
        opportunities: result.opportunities || []
      };
    } catch (error: any) {
      console.error('Flow prediction error:', error);
      return {
        nextBestActions: ["Continue conversation naturally"],
        outcomeConfidence: 0.5,
        recommendedStage: context.conversationStage || 'discovery',
        riskFactors: [],
        opportunities: []
      };
    }
  }
}

export const openaiService = new OpenAIService();
