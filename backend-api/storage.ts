import { type User, type InsertUser, type Analytics, type InsertAnalytics, type AnalyticsSummary } from "./schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createAnalyticsRecord(record: InsertAnalytics): Promise<Analytics>;
  getAnalyticsSummary(startDate: Date, endDate: Date): Promise<AnalyticsSummary>;
  getAllAnalytics(startDate?: Date, endDate?: Date): Promise<Analytics[]>;
}

import { db } from "./db";
import { users, analytics } from "./schema";
import { eq, and, gte, lte, sql, count, sum } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createAnalyticsRecord(record: InsertAnalytics): Promise<Analytics> {
    const [analyticsRecord] = await db
      .insert(analytics)
      .values(record)
      .returning();
    return analyticsRecord;
  }

  async getAllAnalytics(startDate?: Date, endDate?: Date): Promise<Analytics[]> {
    let query = db.select().from(analytics);
    
    if (startDate && endDate) {
      query = query.where(
        and(
          gte(analytics.timestamp, startDate),
          lte(analytics.timestamp, endDate)
        )
      ) as any;
    } else if (startDate) {
      query = query.where(gte(analytics.timestamp, startDate)) as any;
    } else if (endDate) {
      query = query.where(lte(analytics.timestamp, endDate)) as any;
    }

    return query;
  }

  async getAnalyticsSummary(startDate: Date, endDate: Date): Promise<AnalyticsSummary> {
    const records = await this.getAllAnalytics(startDate, endDate);
    
    const chatRecords = records.filter(r => r.type === 'chat');
    const ttsRecords = records.filter(r => r.type === 'tts');
    
    const totalCost = records.reduce((sum, r) => sum + parseFloat(r.cost || '0'), 0);
    const chatCost = chatRecords.reduce((sum, r) => sum + parseFloat(r.cost || '0'), 0);
    const ttsCost = ttsRecords.reduce((sum, r) => sum + parseFloat(r.cost || '0'), 0);
    
    const totalTokens = records.reduce((sum, r) => 
      sum + (r.inputTokens || 0) + (r.outputTokens || 0), 0
    );
    
    const totalCharacters = records.reduce((sum, r) => sum + (r.characters || 0), 0);
    
    const totalDuration = records.reduce((sum, r) => sum + (r.duration || 0), 0);
    const averageResponseTime = records.length > 0 ? totalDuration / records.length : 0;
    
    const uniqueIps = new Set(records.map(r => r.ipAddress));
    
    return {
      totalRequests: records.length,
      chatRequests: chatRecords.length,
      ttsRequests: ttsRecords.length,
      totalCost,
      chatCost,
      ttsCost,
      totalTokens,
      totalCharacters,
      averageResponseTime,
      uniqueUsers: uniqueIps.size,
      period: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      startDate,
      endDate,
    };
  }
}

export const storage = new DatabaseStorage();
