import { eq, and, gte, lt, desc, sql, avg, sum, count } from "drizzle-orm";
import { db } from "./db";
import { users, contacts, calls, appointments, configurations, callAnalytics, dailyMetrics, callRecordings, followUpTasks } from "@shared/schema";
import type { 
  User, InsertUser, 
  Contact, InsertContact, 
  Call, InsertCall, 
  Appointment, InsertAppointment, 
  Configuration, InsertConfiguration 
} from "@shared/schema";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Contacts
  async getContacts(): Promise<Contact[]> {
    return await db.select().from(contacts).orderBy(contacts.createdAt);
  }

  async getContact(id: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact || undefined;
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }

  async updateContact(id: string, updates: Partial<Contact>): Promise<Contact | undefined> {
    const [updatedContact] = await db
      .update(contacts)
      .set(updates)
      .where(eq(contacts.id, id))
      .returning();
    return updatedContact || undefined;
  }

  // Calls
  async getCalls(): Promise<Call[]> {
    return await db.select().from(calls).orderBy(calls.startedAt);
  }

  async getCall(id: string): Promise<Call | undefined> {
    const [call] = await db.select().from(calls).where(eq(calls.id, id));
    return call || undefined;
  }

  async getActiveCalls(): Promise<Call[]> {
    return await db
      .select()
      .from(calls)
      .where(eq(calls.status, 'active'));
  }

  async createCall(call: InsertCall): Promise<Call> {
    const [newCall] = await db.insert(calls).values(call).returning();
    return newCall;
  }

  async updateCall(id: string, updates: Partial<Call>): Promise<Call | undefined> {
    const [updatedCall] = await db
      .update(calls)
      .set(updates)
      .where(eq(calls.id, id))
      .returning();
    return updatedCall || undefined;
  }

  // Appointments
  async getAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments).orderBy(appointments.scheduledTime);
  }

  async getTodayAppointments(): Promise<Appointment[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    return await db
      .select()
      .from(appointments)
      .where(
        and(
          gte(appointments.scheduledTime, startOfDay),
          lt(appointments.scheduledTime, endOfDay)
        )
      )
      .orderBy(appointments.scheduledTime);
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db.insert(appointments).values(appointment).returning();
    return newAppointment;
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | undefined> {
    const [updatedAppointment] = await db
      .update(appointments)
      .set(updates)
      .where(eq(appointments.id, id))
      .returning();
    return updatedAppointment || undefined;
  }

  // Configuration
  async getConfiguration(): Promise<Configuration | undefined> {
    const [config] = await db.select().from(configurations).limit(1);
    return config || undefined;
  }

  async updateConfiguration(updates: Partial<Configuration>): Promise<Configuration> {
    const existingConfig = await this.getConfiguration();
    
    if (existingConfig) {
      const [updatedConfig] = await db
        .update(configurations)
        .set(updates)
        .where(eq(configurations.id, existingConfig.id))
        .returning();
      return updatedConfig;
    } else {
      // Create initial configuration if none exists
      const [newConfig] = await db
        .insert(configurations)
        .values({
          defaultVoice: 'sarah',
          speakingSpeed: 'normal',
          aiModel: 'gpt-5',
          callScriptTemplate: 'Hi, this is [AGENT_NAME] calling from [COMPANY_NAME]. I\'m reaching out regarding [CALL_PURPOSE]. Do you have a few minutes to talk?',
          twilioAccountSid: null,
          twilioAuthToken: null,
          twilioPhoneNumber: null,
          ...updates
        })
        .returning();
      return newConfig;
    }
  }

  // Advanced Analytics Methods
  async getAdvancedStats(): Promise<{
    totalCalls: number;
    successfulCalls: number;
    totalAppointments: number;
    averageCallDuration: number;
    conversionRate: number;
    topPerformingVoices: Array<{ voice: string; successRate: number; callCount: number }>;
    callVolumeByHour: Array<{ hour: number; callCount: number }>;
    recentTrends: Array<{ date: string; calls: number; appointments: number; conversionRate: number }>;
  }> {
    // Get basic call stats
    const [callStats] = await db
      .select({
        totalCalls: count(calls.id),
        successfulCalls: sum(sql<number>`CASE WHEN ${calls.result} IN ('appointment_booked', 'callback_requested') THEN 1 ELSE 0 END`),
        averageDuration: avg(calls.duration),
      })
      .from(calls);

    const [appointmentStats] = await db
      .select({
        totalAppointments: count(appointments.id),
      })
      .from(appointments);

    // Calculate conversion rate
    const totalCalls = Number(callStats.totalCalls ?? 0);
    const totalAppts = Number(appointmentStats.totalAppointments ?? 0);
    const conversionRate = totalCalls > 0 ? (totalAppts / totalCalls) * 100 : 0;

    // Get voice performance
    const voiceStats = await db
      .select({
        voice: calls.voice,
        callCount: count(calls.id),
        successfulCalls: sum(sql<number>`CASE WHEN ${calls.result} = 'appointment_booked' THEN 1 ELSE 0 END`),
      })
      .from(calls)
      .where(sql`${calls.voice} IS NOT NULL`)
      .groupBy(calls.voice);

    const topPerformingVoices = voiceStats.map(v => {
      const count = Number(v.callCount ?? 0);
      const success = Number(v.successfulCalls ?? 0);
      return {
        voice: v.voice || 'unknown',
        callCount: count,
        successRate: count > 0 ? (success / count) * 100 : 0,
      };
    }).sort((a, b) => b.successRate - a.successRate);

    // Get call volume by hour
    const hourlyStats = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${calls.startedAt})`,
        callCount: count(calls.id),
      })
      .from(calls)
      .groupBy(sql`EXTRACT(HOUR FROM ${calls.startedAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${calls.startedAt})`);

    // Get recent trends (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentTrends = await db
      .select({
        date: sql<string>`DATE(${calls.startedAt})`,
        calls: count(calls.id),
        appointments: sum(sql<number>`CASE WHEN ${calls.result} = 'appointment_booked' THEN 1 ELSE 0 END`),
      })
      .from(calls)
      .where(gte(calls.startedAt, sevenDaysAgo))
      .groupBy(sql`DATE(${calls.startedAt})`)
      .orderBy(sql`DATE(${calls.startedAt})`);

    const trendsWithConversion = recentTrends.map(t => {
      const appts = Number(t.appointments ?? 0);
      const calls = Number(t.calls ?? 0);
      return {
        date: t.date,
        calls,
        appointments: appts,
        conversionRate: calls > 0 ? (appts / calls) * 100 : 0,
      };
    });

    return {
      totalCalls,
      successfulCalls: Number(callStats.successfulCalls ?? 0),
      totalAppointments: totalAppts,
      averageCallDuration: Number(callStats.averageDuration ?? 0),
      conversionRate,
      topPerformingVoices,
      callVolumeByHour: hourlyStats.map(stat => ({
        hour: stat.hour,
        callCount: stat.callCount,
      })),
      recentTrends: trendsWithConversion,
    };
  }

  async getCallAnalytics(limit: number = 50): Promise<Array<{
    call: Call;
    analytics: any;
    contact: Contact | null;
  }>> {
    return await db
      .select({
        call: calls,
        analytics: callAnalytics,
        contact: contacts,
      })
      .from(calls)
      .leftJoin(callAnalytics, eq(calls.id, callAnalytics.callId))
      .leftJoin(contacts, eq(calls.contactId, contacts.id))
      .orderBy(desc(calls.startedAt))
      .limit(limit);
  }

  async getDailyMetricsRange(startDate: Date, endDate: Date): Promise<any[]> {
    return await db
      .select()
      .from(dailyMetrics)
      .where(and(
        gte(dailyMetrics.date, startDate),
        lt(dailyMetrics.date, endDate)
      ))
      .orderBy(dailyMetrics.date);
  }

  async getFollowUpTasks(status?: string): Promise<any[]> {
    const whereClause = status ? eq(followUpTasks.status, status) : undefined;
    
    return await db
      .select({
        task: followUpTasks,
        contact: contacts,
        call: calls,
      })
      .from(followUpTasks)
      .leftJoin(contacts, eq(followUpTasks.contactId, contacts.id))
      .leftJoin(calls, eq(followUpTasks.callId, calls.id))
      .where(whereClause)
      .orderBy(followUpTasks.scheduledFor);
  }

  async getCallRecordings(callId?: string): Promise<any[]> {
    const whereClause = callId ? eq(callRecordings.callId, callId) : undefined;
    
    return await db
      .select({
        recording: callRecordings,
        call: calls,
        contact: contacts,
      })
      .from(callRecordings)
      .leftJoin(calls, eq(callRecordings.callId, calls.id))
      .leftJoin(contacts, eq(calls.contactId, contacts.id))
      .where(whereClause)
      .orderBy(desc(callRecordings.createdAt));
  }
}