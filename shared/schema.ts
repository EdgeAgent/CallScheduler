import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, index, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  email: text("email"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calls = pgTable("calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").references(() => contacts.id),
  phoneNumber: text("phone_number").notNull(),
  contactName: text("contact_name"),
  status: text("status").notNull(), // 'active', 'ringing', 'completed', 'failed', 'scheduling'
  duration: integer("duration").default(0), // in seconds
  purpose: text("purpose"),
  voice: text("voice"),
  twilioCallSid: text("twilio_call_sid"),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  result: text("result"), // 'appointment_booked', 'no_answer', 'callback_requested', etc.
  conversation: jsonb("conversation"), // Array of conversation messages
  scheduledAppointmentId: varchar("scheduled_appointment_id"),
});

export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").references(() => contacts.id),
  contactName: text("contact_name").notNull(),
  phoneNumber: text("phone_number"),
  scheduledTime: timestamp("scheduled_time").notNull(),
  status: text("status").notNull().default('scheduled'), // 'scheduled', 'confirmed', 'pending', 'cancelled'
  purpose: text("purpose"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const configurations = pgTable("configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  defaultVoice: text("default_voice").default('sarah'),
  speakingSpeed: text("speaking_speed").default('normal'),
  aiModel: text("ai_model").default('gpt-5'),
  callScriptTemplate: text("call_script_template"),
  twilioAccountSid: text("twilio_account_sid"),
  twilioAuthToken: text("twilio_auth_token"),
  twilioPhoneNumber: text("twilio_phone_number"),
});

// Analytics Tables
export const callAnalytics = pgTable("call_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").references(() => calls.id).notNull(),
  duration: integer("duration").notNull().default(0),
  successRate: decimal("success_rate", { precision: 5, scale: 2 }),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }),
  sentimentScore: decimal("sentiment_score", { precision: 3, scale: 2 }),
  keyTopics: jsonb("key_topics"),
  analysisComplete: boolean("analysis_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  callIdIdx: index("call_analytics_call_id_idx").on(table.callId),
  createdAtIdx: index("call_analytics_created_at_idx").on(table.createdAt),
}));

export const dailyMetrics = pgTable("daily_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  totalCalls: integer("total_calls").default(0),
  successfulCalls: integer("successful_calls").default(0),
  appointmentsBooked: integer("appointments_booked").default(0),
  averageDuration: decimal("average_duration", { precision: 8, scale: 2 }),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  dateIdx: index("daily_metrics_date_idx").on(table.date),
}));

export const callRecordings = pgTable("call_recordings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").references(() => calls.id).notNull(),
  recordingUrl: text("recording_url"),
  transcription: text("transcription"),
  duration: integer("duration"),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  callIdIdx: index("call_recordings_call_id_idx").on(table.callId),
}));

export const followUpTasks = pgTable("follow_up_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").references(() => calls.id),
  contactId: varchar("contact_id").references(() => contacts.id).notNull(),
  taskType: text("task_type").notNull(), // 'callback', 'email', 'meeting_reminder'
  description: text("description").notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: text("status").default('pending'), // 'pending', 'completed', 'cancelled'
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  contactIdIdx: index("follow_up_tasks_contact_id_idx").on(table.contactId),
  scheduledForIdx: index("follow_up_tasks_scheduled_for_idx").on(table.scheduledFor),
  statusIdx: index("follow_up_tasks_status_idx").on(table.status),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  startedAt: true,
  endedAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
});

export const insertConfigurationSchema = createInsertSchema(configurations).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

export type InsertCall = z.infer<typeof insertCallSchema>;
export type Call = typeof calls.$inferSelect;

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export type InsertConfiguration = z.infer<typeof insertConfigurationSchema>;
export type Configuration = typeof configurations.$inferSelect;

// New analytics schemas
export const insertCallAnalyticsSchema = createInsertSchema(callAnalytics).omit({
  id: true,
  createdAt: true,
});

export const insertDailyMetricsSchema = createInsertSchema(dailyMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertCallRecordingSchema = createInsertSchema(callRecordings).omit({
  id: true,
  createdAt: true,
});

export const insertFollowUpTaskSchema = createInsertSchema(followUpTasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertCallAnalytics = z.infer<typeof insertCallAnalyticsSchema>;
export type CallAnalytics = typeof callAnalytics.$inferSelect;

export type InsertDailyMetrics = z.infer<typeof insertDailyMetricsSchema>;
export type DailyMetrics = typeof dailyMetrics.$inferSelect;

export type InsertCallRecording = z.infer<typeof insertCallRecordingSchema>;
export type CallRecording = typeof callRecordings.$inferSelect;

export type InsertFollowUpTask = z.infer<typeof insertFollowUpTaskSchema>;
export type FollowUpTask = typeof followUpTasks.$inferSelect;

// Database Relations
export const contactsRelations = relations(contacts, ({ many }) => ({
  calls: many(calls),
  appointments: many(appointments),
  followUpTasks: many(followUpTasks),
}));

export const callsRelations = relations(calls, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [calls.contactId],
    references: [contacts.id],
  }),
  analytics: one(callAnalytics),
  recording: one(callRecordings),
  followUpTasks: many(followUpTasks),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  contact: one(contacts, {
    fields: [appointments.contactId],
    references: [contacts.id],
  }),
}));

export const callAnalyticsRelations = relations(callAnalytics, ({ one }) => ({
  call: one(calls, {
    fields: [callAnalytics.callId],
    references: [calls.id],
  }),
}));

export const callRecordingsRelations = relations(callRecordings, ({ one }) => ({
  call: one(calls, {
    fields: [callRecordings.callId],
    references: [calls.id],
  }),
}));

export const followUpTasksRelations = relations(followUpTasks, ({ one }) => ({
  contact: one(contacts, {
    fields: [followUpTasks.contactId],
    references: [contacts.id],
  }),
  call: one(calls, {
    fields: [followUpTasks.callId],
    references: [calls.id],
  }),
}));
