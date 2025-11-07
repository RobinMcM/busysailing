import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
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
