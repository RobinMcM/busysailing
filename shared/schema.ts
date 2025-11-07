import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  conversationHistory: z.array(chatMessageSchema).optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const analyticsRecordSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  type: z.enum(['chat', 'tts']),
  ipAddress: z.string(),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  characters: z.number().optional(),
  model: z.string(),
  cost: z.number(),
  duration: z.number(),
});

export const analyticsSummarySchema = z.object({
  totalRequests: z.number(),
  chatRequests: z.number(),
  ttsRequests: z.number(),
  totalCost: z.number(),
  chatCost: z.number(),
  ttsCost: z.number(),
  totalTokens: z.number(),
  totalCharacters: z.number(),
  averageResponseTime: z.number(),
  uniqueUsers: z.number(),
  period: z.string(),
  startDate: z.date(),
  endDate: z.date(),
});

export type AnalyticsRecord = z.infer<typeof analyticsRecordSchema>;
export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>;

export const analytics = pgTable("analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  type: varchar("type", { length: 10 }).notNull(),
  ipAddress: text("ip_address").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  characters: integer("characters"),
  model: text("model").notNull(),
  cost: decimal("cost", { precision: 10, scale: 6 }).notNull(),
  duration: integer("duration").notNull(),
});

export const insertAnalyticsSchema = createInsertSchema(analytics).omit({
  id: true,
  timestamp: true,
});

export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type Analytics = typeof analytics.$inferSelect;
