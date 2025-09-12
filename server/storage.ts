import { type User, type InsertUser, type Contact, type InsertContact, type Call, type InsertCall, type Appointment, type InsertAppointment, type Configuration, type InsertConfiguration, users, contacts, calls, appointments, configurations } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { eq, and, gte, lt } from 'drizzle-orm';

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Contacts
  getContacts(): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, contact: Partial<Contact>): Promise<Contact | undefined>;
  deleteContact(id: string): Promise<boolean>;
  
  // Calls
  getCalls(): Promise<Call[]>;
  getCall(id: string): Promise<Call | undefined>;
  getActiveCalls(): Promise<Call[]>;
  createCall(call: InsertCall): Promise<Call>;
  updateCall(id: string, call: Partial<Call>): Promise<Call | undefined>;
  
  // Appointments
  getAppointments(): Promise<Appointment[]>;
  getTodayAppointments(): Promise<Appointment[]>;
  getAppointmentsByMonth(year: number, month: number): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<Appointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<boolean>;
  
  // Configuration
  getConfiguration(): Promise<Configuration | undefined>;
  updateConfiguration(config: Partial<Configuration>): Promise<Configuration>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private contacts: Map<string, Contact>;
  private calls: Map<string, Call>;
  private appointments: Map<string, Appointment>;
  private configuration: Configuration | undefined;

  constructor() {
    this.users = new Map();
    this.contacts = new Map();
    this.calls = new Map();
    this.appointments = new Map();
    
    // Initialize default configuration - credentials should be set via environment variables
    this.configuration = {
      id: randomUUID(),
      defaultVoice: 'sarah',
      speakingSpeed: 'normal',
      aiModel: 'gpt-5',
      callScriptTemplate: 'Hi, this is [AGENT_NAME] calling from [COMPANY_NAME]. I\'m reaching out regarding [CALL_PURPOSE]. Do you have a few minutes to talk?',
      twilioAccountSid: null,
      twilioAuthToken: null,
      twilioPhoneNumber: null,
      openaiApiKey: null,
    };
    
    // Add demo data for testing
    this.initializeDemoData();
  }

  private initializeDemoData() {
    // Add demo contacts
    const contact1: Contact = {
      id: randomUUID(),
      name: 'Sarah Johnson',
      phoneNumber: '+15551234567',
      email: 'sarah@example.com',
      notes: 'Potential client interested in services',
      createdAt: new Date()
    };
    const contact2: Contact = {
      id: randomUUID(),
      name: 'Mike Wilson',
      phoneNumber: '+15559876543',
      email: 'mike@company.com',
      notes: 'Follow-up call needed',
      createdAt: new Date()
    };
    this.contacts.set(contact1.id, contact1);
    this.contacts.set(contact2.id, contact2);

    // Add demo completed calls
    const call1: Call = {
      id: randomUUID(),
      contactId: contact1.id,
      phoneNumber: contact1.phoneNumber,
      contactName: contact1.name,
      status: 'completed',
      duration: 180,
      purpose: 'lead_generation',
      voice: 'sarah',
      twilioCallSid: null,
      startedAt: new Date(Date.now() - 3600000), // 1 hour ago
      endedAt: new Date(Date.now() - 3300000), // 55 minutes ago
      result: 'appointment_booked',
      conversation: [
        {
          role: 'assistant',
          content: 'Hi Sarah, this is calling from our agency. I\'m reaching out regarding potential business opportunities. Do you have a few minutes to talk?',
          timestamp: new Date()
        },
        {
          role: 'user',
          content: 'Yes, I\'m interested in learning more.',
          timestamp: new Date()
        }
      ],
      scheduledAppointmentId: null
    };
    
    const call2: Call = {
      id: randomUUID(),
      contactId: contact2.id,
      phoneNumber: contact2.phoneNumber,
      contactName: contact2.name,
      status: 'completed',
      duration: 45,
      purpose: 'follow_up',
      voice: 'david',
      twilioCallSid: null,
      startedAt: new Date(Date.now() - 7200000), // 2 hours ago
      endedAt: new Date(Date.now() - 7050000), // 1h 57m ago
      result: 'callback_requested',
      conversation: [],
      scheduledAppointmentId: null
    };
    
    this.calls.set(call1.id, call1);
    this.calls.set(call2.id, call2);

    // Add demo appointments for today
    const appointment1: Appointment = {
      id: randomUUID(),
      contactId: contact1.id,
      contactName: contact1.name,
      phoneNumber: contact1.phoneNumber,
      scheduledTime: new Date(Date.now() + 3600000), // 1 hour from now
      status: 'confirmed',
      purpose: 'consultation',
      notes: 'Initial consultation call',
      createdAt: new Date()
    };
    
    const appointment2: Appointment = {
      id: randomUUID(),
      contactId: contact2.id,
      contactName: contact2.name,
      phoneNumber: contact2.phoneNumber,
      scheduledTime: new Date(Date.now() + 7200000), // 2 hours from now
      status: 'pending',
      purpose: 'follow_up',
      notes: 'Follow-up discussion',
      createdAt: new Date()
    };
    
    this.appointments.set(appointment1.id, appointment1);
    this.appointments.set(appointment2.id, appointment2);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  async getContact(id: string): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = randomUUID();
    const contact: Contact = { 
      ...insertContact, 
      id,
      createdAt: new Date(),
      email: insertContact.email ?? null,
      notes: insertContact.notes ?? null
    };
    this.contacts.set(id, contact);
    return contact;
  }

  async updateContact(id: string, contactUpdate: Partial<Contact>): Promise<Contact | undefined> {
    const existing = this.contacts.get(id);
    if (!existing) return undefined;
    
    const updated: Contact = { ...existing, ...contactUpdate };
    this.contacts.set(id, updated);
    return updated;
  }

  async deleteContact(id: string): Promise<boolean> {
    return this.contacts.delete(id);
  }

  async getCalls(): Promise<Call[]> {
    return Array.from(this.calls.values());
  }

  async getCall(id: string): Promise<Call | undefined> {
    return this.calls.get(id);
  }

  async getActiveCalls(): Promise<Call[]> {
    return Array.from(this.calls.values()).filter(
      call => ['active', 'ringing', 'scheduling'].includes(call.status)
    );
  }

  async createCall(insertCall: InsertCall): Promise<Call> {
    const id = randomUUID();
    const call: Call = { 
      ...insertCall, 
      id,
      startedAt: new Date(),
      endedAt: null,
      contactId: insertCall.contactId ?? null,
      contactName: insertCall.contactName ?? null,
      duration: insertCall.duration ?? 0,
      purpose: insertCall.purpose ?? null,
      voice: insertCall.voice ?? null,
      twilioCallSid: insertCall.twilioCallSid ?? null,
      result: insertCall.result ?? null,
      conversation: insertCall.conversation ?? [],
      scheduledAppointmentId: insertCall.scheduledAppointmentId ?? null
    };
    this.calls.set(id, call);
    return call;
  }

  async updateCall(id: string, callUpdate: Partial<Call>): Promise<Call | undefined> {
    const existing = this.calls.get(id);
    if (!existing) return undefined;
    
    const updated: Call = { ...existing, ...callUpdate };
    if (callUpdate.status && !['active', 'ringing', 'scheduling'].includes(callUpdate.status)) {
      updated.endedAt = new Date();
    }
    this.calls.set(id, updated);
    return updated;
  }

  async getAppointments(): Promise<Appointment[]> {
    return Array.from(this.appointments.values());
  }

  async getTodayAppointments(): Promise<Appointment[]> {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    return Array.from(this.appointments.values()).filter(
      appointment => appointment.scheduledTime >= todayStart && appointment.scheduledTime < todayEnd
    );
  }

  async getAppointmentsByMonth(year: number, month: number): Promise<Appointment[]> {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 1);

    return Array.from(this.appointments.values()).filter(
      appointment => appointment.scheduledTime >= monthStart && appointment.scheduledTime < monthEnd
    );
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const id = randomUUID();
    const appointment: Appointment = { 
      ...insertAppointment, 
      id,
      createdAt: new Date(),
      status: insertAppointment.status ?? 'scheduled',
      phoneNumber: insertAppointment.phoneNumber ?? null,
      notes: insertAppointment.notes ?? null,
      contactId: insertAppointment.contactId ?? null,
      purpose: insertAppointment.purpose ?? null
    };
    this.appointments.set(id, appointment);
    return appointment;
  }

  async updateAppointment(id: string, appointmentUpdate: Partial<Appointment>): Promise<Appointment | undefined> {
    const existing = this.appointments.get(id);
    if (!existing) return undefined;
    
    const updated: Appointment = { ...existing, ...appointmentUpdate };
    this.appointments.set(id, updated);
    return updated;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    return this.appointments.delete(id);
  }

  async getConfiguration(): Promise<Configuration | undefined> {
    return this.configuration;
  }

  async updateConfiguration(configUpdate: Partial<Configuration>): Promise<Configuration> {
    if (!this.configuration) {
      const id = randomUUID();
      this.configuration = {
        id,
        defaultVoice: 'sarah',
        speakingSpeed: 'normal',
        aiModel: 'gpt-5',
        callScriptTemplate: '',
        twilioAccountSid: null,
        twilioAuthToken: null,
        twilioPhoneNumber: null,
        openaiApiKey: null,
        ...configUpdate
      };
    } else {
      this.configuration = { ...this.configuration, ...configUpdate };
    }
    return this.configuration;
  }
}

export class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(pool);
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getContacts(): Promise<Contact[]> {
    return await this.db.select().from(contacts);
  }

  async getContact(id: string): Promise<Contact | undefined> {
    const result = await this.db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
    return result[0];
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const result = await this.db.insert(contacts).values(insertContact).returning();
    return result[0];
  }

  async updateContact(id: string, contactUpdate: Partial<Contact>): Promise<Contact | undefined> {
    const result = await this.db
      .update(contacts)
      .set(contactUpdate)
      .where(eq(contacts.id, id))
      .returning();
    return result[0];
  }

  async deleteContact(id: string): Promise<boolean> {
    const result = await this.db.delete(contacts).where(eq(contacts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getCalls(): Promise<Call[]> {
    return await this.db.select().from(calls);
  }

  async getCall(id: string): Promise<Call | undefined> {
    const result = await this.db.select().from(calls).where(eq(calls.id, id)).limit(1);
    return result[0];
  }

  async getActiveCalls(): Promise<Call[]> {
    return await this.db.select().from(calls).where(eq(calls.status, 'active'));
  }

  async createCall(insertCall: InsertCall): Promise<Call> {
    const result = await this.db.insert(calls).values(insertCall).returning();
    return result[0];
  }

  async updateCall(id: string, callUpdate: Partial<Call>): Promise<Call | undefined> {
    const result = await this.db
      .update(calls)
      .set(callUpdate)
      .where(eq(calls.id, id))
      .returning();
    return result[0];
  }

  async getAppointments(): Promise<Appointment[]> {
    return await this.db.select().from(appointments);
  }

  async getTodayAppointments(): Promise<Appointment[]> {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    return await this.db
      .select()
      .from(appointments)
      .where(and(
        gte(appointments.scheduledTime, todayStart),
        lt(appointments.scheduledTime, todayEnd)
      ));
  }

  async getAppointmentsByMonth(year: number, month: number): Promise<Appointment[]> {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 1);

    return await this.db
      .select()
      .from(appointments)
      .where(and(
        gte(appointments.scheduledTime, monthStart),
        lt(appointments.scheduledTime, monthEnd)
      ));
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const result = await this.db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    return result[0];
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const result = await this.db.insert(appointments).values(insertAppointment).returning();
    return result[0];
  }

  async updateAppointment(id: string, appointmentUpdate: Partial<Appointment>): Promise<Appointment | undefined> {
    const result = await this.db
      .update(appointments)
      .set(appointmentUpdate)
      .where(eq(appointments.id, id))
      .returning();
    return result[0];
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const result = await this.db.delete(appointments).where(eq(appointments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getConfiguration(): Promise<Configuration | undefined> {
    const result = await this.db.select().from(configurations).limit(1);
    return result[0];
  }

  async updateConfiguration(configUpdate: Partial<Configuration>): Promise<Configuration> {
    const existing = await this.getConfiguration();
    
    if (existing) {
      const result = await this.db
        .update(configurations)
        .set(configUpdate)
        .where(eq(configurations.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await this.db.insert(configurations).values(configUpdate).returning();
      return result[0];
    }
  }
}

export const storage = new MemStorage();
