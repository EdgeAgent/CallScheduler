import { db } from "./db";
import { 
  contacts, calls, appointments, callAnalytics, dailyMetrics, 
  callRecordings, followUpTasks, configurations,
  type InsertContact, type InsertCall, type InsertAppointment,
  type InsertCallAnalytics, type InsertDailyMetrics, type InsertCallRecording,
  type InsertFollowUpTask
} from "@shared/schema";
import { randomUUID } from "crypto";

// Helper function to generate random dates
function randomDateInRange(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to generate phone numbers
function generatePhoneNumber(): string {
  const areaCode = Math.floor(Math.random() * 800) + 200;
  const exchange = Math.floor(Math.random() * 800) + 200;
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `+1${areaCode}${exchange}${number}`;
}

export async function seedDatabase() {
  console.log("🌱 Starting database seeding...");
  
  try {
    // Clear existing data (for fresh seeding)
    await db.delete(followUpTasks);
    await db.delete(callRecordings);
    await db.delete(callAnalytics);
    await db.delete(dailyMetrics);
    await db.delete(appointments);
    await db.delete(calls);
    await db.delete(contacts);
    
    console.log("✅ Cleared existing data");

    // Seed contacts
    const contactsData: InsertContact[] = [
      {
        name: "Sarah Johnson",
        phoneNumber: "+15551234567",
        email: "sarah.johnson@techcorp.com",
        notes: "CEO of TechCorp, interested in premium package",
      },
      {
        name: "Michael Chen",
        phoneNumber: "+15559876543", 
        email: "m.chen@startup.io",
        notes: "Startup founder, budget-conscious but high potential",
      },
      {
        name: "Emily Rodriguez",
        phoneNumber: "+15555551234",
        email: "emily@consulting.com",
        notes: "Marketing consultant, needs enterprise solution",
      },
      {
        name: "David Park",
        phoneNumber: "+15557778888",
        email: "d.park@healthtech.com",
        notes: "Healthcare startup CTO, compliance requirements",
      },
      {
        name: "Lisa Thompson",
        phoneNumber: "+15554445555",
        email: "lisa@finance.com",
        notes: "Financial services, high-value client potential",
      },
      {
        name: "Robert Wilson",
        phoneNumber: "+15556667777",
        email: "rob@ecommerce.shop",
        notes: "E-commerce owner, seasonal business needs",
      },
      {
        name: "Amanda Foster",
        phoneNumber: "+15553334444",
        email: "amanda@nonprofit.org",
        notes: "Non-profit director, limited budget but great cause",
      },
      {
        name: "James Martinez",
        phoneNumber: "+15558889999",
        email: "james@construction.co",
        notes: "Construction company owner, traditional business",
      }
    ];

    const insertedContacts = await db.insert(contacts).values(contactsData).returning();
    console.log(`✅ Seeded ${insertedContacts.length} contacts`);

    // Seed calls with various outcomes
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const callsData: InsertCall[] = [];
    const callAnalyticsData: InsertCallAnalytics[] = [];
    const appointmentsData: InsertAppointment[] = [];
    const recordingsData: InsertCallRecording[] = [];
    const followUpData: InsertFollowUpTask[] = [];

    // Generate and insert calls first to get their IDs
    const allCallsData: { contact: any, call: InsertCall, callDate: Date, duration: number, result: string }[] = [];
    
    for (const contact of insertedContacts) {
      const numCalls = Math.floor(Math.random() * 4) + 1; // 1-4 calls per contact
      
      for (let i = 0; i < numCalls; i++) {
        const callDate = randomDateInRange(thirtyDaysAgo, now);
        const duration = Math.floor(Math.random() * 1200) + 30; // 30 seconds to 20 minutes
        const statuses = ['completed', 'completed', 'completed', 'failed', 'completed'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const voices = ['sarah', 'david', 'emma', 'michael'];
        const voice = voices[Math.floor(Math.random() * voices.length)];
        const results = ['appointment_booked', 'callback_requested', 'not_interested', 'no_answer', 'left_voicemail'];
        const result = results[Math.floor(Math.random() * results.length)];

        const call: InsertCall = {
          contactId: contact.id,
          phoneNumber: contact.phoneNumber,
          contactName: contact.name,
          status,
          duration,
          purpose: "Product demonstration and consultation",
          voice,
          twilioCallSid: `CA${randomUUID().replace(/-/g, '').substring(0, 32)}`,
          result,
          conversation: [
            {
              role: "agent",
              content: `Hi ${contact.name}, this is ${voice} calling from our outreach team. I'm reaching out regarding our premium business solutions. Do you have a few minutes to talk?`,
              timestamp: callDate.toISOString()
            },
            {
              role: "customer", 
              content: result === 'appointment_booked' ? "Yes, I'm interested. Can we schedule a meeting?" : 
                       result === 'callback_requested' ? "I'm busy right now, can you call back tomorrow?" :
                       result === 'not_interested' ? "I'm not interested in this service." :
                       "No response - went to voicemail",
              timestamp: new Date(callDate.getTime() + 30000).toISOString()
            }
          ],
        };

        allCallsData.push({ contact, call, callDate, duration, result });
      }
    }

    // Insert all calls and get their generated IDs
    const insertedCalls = await db.insert(calls).values(allCallsData.map(item => item.call)).returning();
    console.log(`✅ Seeded ${insertedCalls.length} calls`);

    // Now insert related data using the actual call IDs
    for (let i = 0; i < insertedCalls.length; i++) {
      const insertedCall = insertedCalls[i];
      const { contact, callDate, duration, result } = allCallsData[i];

      // Add call analytics
      const analytics: InsertCallAnalytics = {
        callId: insertedCall.id,
        duration,
        successRate: result === 'appointment_booked' ? "95.50" : 
                    result === 'callback_requested' ? "75.25" : "45.75",
        conversionRate: result === 'appointment_booked' ? "85.00" : "12.50",
        sentimentScore: result === 'appointment_booked' ? "0.85" :
                       result === 'callback_requested' ? "0.65" : "0.25",
        keyTopics: result === 'appointment_booked' ? 
          ["pricing", "features", "timeline", "demo_request"] :
          ["busy", "not_interested", "competitor"],
        analysisComplete: true,
      };
      callAnalyticsData.push(analytics);

      // Add appointment if booked
      if (result === 'appointment_booked') {
        const appointmentDate = new Date(callDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
        const appointment: InsertAppointment = {
          contactId: contact.id,
          contactName: contact.name,
          phoneNumber: contact.phoneNumber,
          scheduledTime: appointmentDate,
          status: appointmentDate > now ? 'scheduled' : 'completed',
          purpose: "Product demonstration and consultation",
          notes: "Follow-up meeting to discuss implementation details",
        };
        appointmentsData.push(appointment);
      }

      // Add call recording for completed calls
      if (insertedCall.status === 'completed') {
        const recording: InsertCallRecording = {
          callId: insertedCall.id,
          recordingUrl: `https://api.twilio.com/recordings/${randomUUID()}.mp3`,
          transcription: `Call transcript for ${contact.name} - discussed ${result.replace('_', ' ')}. Duration: ${Math.floor(duration/60)}:${(duration%60).toString().padStart(2, '0')}.`,
          duration,
          fileSize: Math.floor(duration * 1024), // Approximate file size
        };
        recordingsData.push(recording);
      }

      // Add follow-up tasks
      if (result === 'callback_requested') {
        const followUp: InsertFollowUpTask = {
          callId: insertedCall.id,
          contactId: contact.id,
          taskType: 'callback',
          description: `Follow-up call requested by ${contact.name}`,
          scheduledFor: new Date(callDate.getTime() + 24 * 60 * 60 * 1000), // Next day
          status: 'pending',
        };
        followUpData.push(followUp);
      }
    }

    // Insert all related data
    if (callAnalyticsData.length > 0) {
      await db.insert(callAnalytics).values(callAnalyticsData);
      console.log(`✅ Seeded ${callAnalyticsData.length} call analytics`);
    }
    
    if (appointmentsData.length > 0) {
      await db.insert(appointments).values(appointmentsData);
      console.log(`✅ Seeded ${appointmentsData.length} appointments`);
    }
    
    if (recordingsData.length > 0) {
      await db.insert(callRecordings).values(recordingsData);
      console.log(`✅ Seeded ${recordingsData.length} call recordings`);
    }
    
    if (followUpData.length > 0) {
      await db.insert(followUpTasks).values(followUpData);
      console.log(`✅ Seeded ${followUpData.length} follow-up tasks`);
    }

    // Generate daily metrics for the last 30 days
    const metricsData: InsertDailyMetrics[] = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dailyCalls = Math.floor(Math.random() * 20) + 5; // 5-25 calls per day
      const successful = Math.floor(dailyCalls * (0.6 + Math.random() * 0.3)); // 60-90% success rate
      const booked = Math.floor(successful * (0.2 + Math.random() * 0.3)); // 20-50% booking rate
      
      const metrics: InsertDailyMetrics = {
        date,
        totalCalls: dailyCalls,
        successfulCalls: successful,
        appointmentsBooked: booked,
        averageDuration: (180 + Math.random() * 300).toFixed(2), // 3-8 minutes average
        conversionRate: ((booked / dailyCalls) * 100).toFixed(2),
        totalRevenue: (booked * (500 + Math.random() * 2000)).toFixed(2), // $500-2500 per booking
      };
      
      metricsData.push(metrics);
    }

    await db.insert(dailyMetrics).values(metricsData);
    console.log(`✅ Seeded ${metricsData.length} daily metrics`);

    // Ensure configuration exists
    const existingConfig = await db.select().from(configurations).limit(1);
    if (existingConfig.length === 0) {
      await db.insert(configurations).values({
        defaultVoice: 'sarah',
        speakingSpeed: 'normal',
        aiModel: 'gpt-5',
        callScriptTemplate: 'Hi, this is [AGENT_NAME] calling from [COMPANY_NAME]. I\'m reaching out regarding [CALL_PURPOSE]. Do you have a few minutes to talk?',
        twilioAccountSid: null,
        twilioAuthToken: null,
        twilioPhoneNumber: null,
      });
      console.log(`✅ Created default configuration`);
    }

    console.log("🎉 Database seeding completed successfully!");
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log("✅ Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}