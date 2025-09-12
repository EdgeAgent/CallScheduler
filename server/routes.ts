import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { twilioService } from "./services/twilioService";
import { openaiService, type ConversationMessage } from "./services/openaiService";
import { insertCallSchema, insertContactSchema, insertAppointmentSchema, insertConfigurationSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const connectedClients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    connectedClients.add(ws);
    ws.on('close', () => {
      connectedClients.delete(ws);
    });
  });

  function broadcastUpdate(type: string, data: any) {
    const message = JSON.stringify({ type, data });
    connectedClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  // Dashboard stats
  app.get('/api/stats', async (req, res) => {
    try {
      const calls = await storage.getCalls();
      const activeCalls = await storage.getActiveCalls();
      const todayAppointments = await storage.getTodayAppointments();
      
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const todayCalls = calls.filter(call => 
        call.startedAt && call.startedAt >= todayStart
      );
      
      const successfulCalls = calls.filter(call => 
        call.result === 'appointment_booked'
      );
      
      const totalMinutes = calls.reduce((sum, call) => sum + (call.duration || 0), 0) / 60;

      res.json({
        activeCalls: activeCalls.length,
        scheduledToday: todayAppointments.length,
        successRate: calls.length > 0 ? (successfulCalls.length / calls.length * 100).toFixed(1) : '0.0',
        totalMinutes: Math.round(totalMinutes)
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all contacts
  app.get('/api/contacts', async (req, res) => {
    try {
      const contacts = await storage.getContacts();
      res.json(contacts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create contact
  app.post('/api/contacts', async (req, res) => {
    try {
      const contact = insertContactSchema.parse(req.body);
      const newContact = await storage.createContact(contact);
      res.json(newContact);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get all calls
  app.get('/api/calls', async (req, res) => {
    try {
      const calls = await storage.getCalls();
      res.json(calls);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get active calls
  app.get('/api/calls/active', async (req, res) => {
    try {
      const activeCalls = await storage.getActiveCalls();
      res.json(activeCalls);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Initiate a new call
  app.post('/api/calls/initiate', async (req, res) => {
    try {
      const { phoneNumber, contactName, purpose, voice } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: 'Phone number is required' });
      }

      // Create call record
      const callData = insertCallSchema.parse({
        phoneNumber,
        contactName: contactName || null,
        status: 'ringing',
        purpose: purpose || 'outreach',
        voice: voice || 'sarah',
        duration: 0,
        twilioCallSid: null,
        contactId: null,
        result: null,
        conversation: [],
        scheduledAppointmentId: null
      });

      const call = await storage.createCall(callData);

      // Get webhook URL
      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : `http://localhost:${process.env.PORT || 5000}`;
      
      const webhookUrl = `${baseUrl}/api/calls/voice/${call.id}`;

      // Initiate Twilio call
      try {
        const twilioCallSid = await twilioService.makeCall(phoneNumber, webhookUrl);
        await storage.updateCall(call.id, { twilioCallSid, status: 'ringing' });
        
        broadcastUpdate('call_initiated', { callId: call.id, status: 'ringing' });
        
        res.json({ callId: call.id, status: 'ringing' });
      } catch (twilioError: any) {
        await storage.updateCall(call.id, { status: 'failed', result: 'connection_failed' });
        broadcastUpdate('call_failed', { callId: call.id, error: twilioError.message });
        res.status(500).json({ message: `Failed to initiate call: ${twilioError.message}` });
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // End a call
  app.post('/api/calls/:callId/end', async (req, res) => {
    try {
      const { callId } = req.params;
      const call = await storage.getCall(callId);
      
      if (!call) {
        return res.status(404).json({ message: 'Call not found' });
      }

      if (call.twilioCallSid) {
        await twilioService.endCall(call.twilioCallSid);
      }

      await storage.updateCall(callId, { status: 'completed' });
      broadcastUpdate('call_ended', { callId });
      
      res.json({ message: 'Call ended' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Twilio voice webhook
  app.post('/api/calls/voice/:callId', async (req, res) => {
    try {
      const { callId } = req.params;
      const call = await storage.getCall(callId);
      
      if (!call) {
        return res.status(404).send('Call not found');
      }

      const config = await storage.getConfiguration();
      const script = config?.callScriptTemplate || 
        'Hi, this is calling from our agency. Do you have a few minutes to talk?';

      // Replace placeholders in script
      const personalizedScript = script
        .replace('[AGENT_NAME]', 'Sarah')
        .replace('[COMPANY_NAME]', 'our agency')
        .replace('[CALL_PURPOSE]', call.purpose || 'business opportunity');

      // Update call to active
      await storage.updateCall(callId, { status: 'active' });
      broadcastUpdate('call_active', { callId, status: 'active' });

      const voiceOptions = twilioService.generateVoiceOptions(call.voice || 'sarah');
      const twiml = twilioService.generateTwiML(personalizedScript, callId, voiceOptions);
      
      res.type('text/xml').send(twiml);
    } catch (error: any) {
      console.error('Voice webhook error:', error);
      res.status(500).send('Server error');
    }
  });

  // Handle speech input from Twilio
  app.post('/api/calls/speech/:callId', async (req, res) => {
    const { callId } = req.params;
    try {
      const { SpeechResult } = req.body;
      
      const call = await storage.getCall(callId);
      if (!call) {
        return res.status(404).send('Call not found');
      }

      const conversation = (call.conversation as ConversationMessage[]) || [];
      
      // Add user's speech to conversation
      conversation.push({
        role: 'user',
        content: SpeechResult || 'No response',
        timestamp: new Date()
      });

      const config = await storage.getConfiguration();
      const context = {
        contactName: call.contactName || undefined,
        phoneNumber: call.phoneNumber,
        purpose: call.purpose || 'outreach',
        callScript: config?.callScriptTemplate || '',
        previousMessages: conversation
      };

      // Get AI response
      const aiResponse = await openaiService.generateCallResponse(context, SpeechResult || '');
      
      // Add AI response to conversation
      conversation.push({
        role: 'assistant',
        content: aiResponse.response,
        timestamp: new Date()
      });

      // Update call with conversation
      await storage.updateCall(callId, { conversation });

      let nextAction: string | undefined;
      
      // Handle different intents
      if (aiResponse.intent === 'schedule') {
        await storage.updateCall(callId, { status: 'scheduling' });
        broadcastUpdate('call_scheduling', { callId });
        
        if (aiResponse.appointmentDetails) {
          // Create appointment if details are provided
          const appointment = await storage.createAppointment({
            contactId: call.contactId,
            contactName: call.contactName || 'Unknown',
            phoneNumber: call.phoneNumber,
            scheduledTime: new Date(), // This should be parsed from appointmentDetails
            status: 'pending',
            purpose: call.purpose || 'consultation',
            notes: aiResponse.appointmentDetails.notes || ''
          });
          
          await storage.updateCall(callId, { 
            result: 'appointment_booked',
            scheduledAppointmentId: appointment.id 
          });
        }
      } else if (aiResponse.intent === 'end') {
        await storage.updateCall(callId, { status: 'completed' });
        
        // Analyze call outcome
        const analysis = await openaiService.analyzeCallOutcome(conversation);
        await storage.updateCall(callId, { result: analysis.outcome });
        
        broadcastUpdate('call_completed', { callId, result: analysis.outcome });
      }

      // Generate TwiML response
      const voiceOptions = twilioService.generateVoiceOptions(call.voice || 'sarah');
      let twiml: string;
      
      if (aiResponse.intent === 'end') {
        twiml = twilioService.generateTwiML(aiResponse.response + ' Goodbye!', callId, voiceOptions);
      } else {
        twiml = twilioService.generateTwiML(aiResponse.response, callId, voiceOptions);
      }
      
      res.type('text/xml').send(twiml);
    } catch (error: any) {
      console.error('Speech processing error:', error);
      const fallbackTwiml = twilioService.generateTwiML(
        'I apologize, but I\'m having technical difficulties. Let me transfer you to a human agent.',
        callId
      );
      res.type('text/xml').send(fallbackTwiml);
    }
  });

  // Twilio status callback
  app.post('/api/calls/status/:callId', async (req, res) => {
    try {
      const { callId } = req.params;
      const { CallStatus, CallDuration } = req.body;
      
      const statusMap: Record<string, string> = {
        'initiated': 'ringing',
        'ringing': 'ringing',
        'answered': 'active',
        'completed': 'completed',
        'failed': 'failed',
        'busy': 'failed',
        'no-answer': 'failed'
      };

      const mappedStatus = statusMap[CallStatus] || 'failed';
      const duration = parseInt(CallDuration) || 0;

      await storage.updateCall(callId, { 
        status: mappedStatus,
        duration 
      });

      broadcastUpdate('call_status_update', { callId, status: mappedStatus, duration });
      
      res.json({ message: 'Status updated' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get appointments
  app.get('/api/appointments', async (req, res) => {
    try {
      const appointments = await storage.getAppointments();
      res.json(appointments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get today's appointments
  app.get('/api/appointments/today', async (req, res) => {
    try {
      const appointments = await storage.getTodayAppointments();
      res.json(appointments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create appointment
  app.post('/api/appointments', async (req, res) => {
    try {
      const appointment = insertAppointmentSchema.parse(req.body);
      const newAppointment = await storage.createAppointment(appointment);
      broadcastUpdate('appointment_created', newAppointment);
      res.json(newAppointment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get configuration
  app.get('/api/configuration', async (req, res) => {
    try {
      const config = await storage.getConfiguration();
      if (config) {
        // Never expose sensitive credentials to frontend
        const safeConfig = {
          ...config,
          twilioAccountSid: config.twilioAccountSid ? '***HIDDEN***' : null,
          twilioAuthToken: config.twilioAuthToken ? '***HIDDEN***' : null
        };
        res.json(safeConfig);
      } else {
        res.json(null);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update configuration
  app.put('/api/configuration', async (req, res) => {
    try {
      const configUpdate = insertConfigurationSchema.parse(req.body);
      const config = await storage.updateConfiguration(configUpdate);
      res.json(config);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  return httpServer;
}
