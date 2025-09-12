import { eq, and, gte, lt } from "drizzle-orm";
import { db } from "./db";
import { users, contacts, calls, appointments, configurations } from "@shared/schema";
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
}