import { db } from './db';
import { analytics, conversations, settings } from '../shared/schema';
import { eq, gte, lte, desc, sql } from 'drizzle-orm';

export interface Analytics {
  id: string;
  timestamp: Date;
  type: 'chat' | 'tts' | 'video';
  ipAddress: string;
  inputTokens: number | null;
  outputTokens: number | null;
  characters: number | null;
  model: string;
  cost: string;
  duration: number;
}

export interface AnalyticsSummary {
  totalRequests: number;
  chatRequests: number;
  ttsRequests: number;
  videoRequests: number;
  totalCost: number;
  chatCost: number;
  ttsCost: number;
  videoCost: number;
  uniqueUsers: number;
  averageResponseTime: number;
  totalTokens: number;
  totalCharacters: number;
  period: string;
  startDate: Date;
  endDate: Date;
}

export interface Conversation {
  id: string;
  userQuestion: string;
  aiResponse: string;
  ipAddress: string | null;
  timestamp: Date;
}

class SupabaseStorage {
  async createAnalyticsRecord(record: Omit<Analytics, 'id' | 'timestamp'>): Promise<Analytics> {
    try {
      const [inserted] = await db
        .insert(analytics)
        .values({
          type: record.type,
          ipAddress: record.ipAddress,
          inputTokens: record.inputTokens,
          outputTokens: record.outputTokens,
          characters: record.characters,
          model: record.model,
          cost: record.cost,
          duration: record.duration,
        })
        .returning();

      return {
        id: inserted.id,
        timestamp: inserted.timestamp,
        type: inserted.type as 'chat' | 'tts' | 'video',
        ipAddress: inserted.ipAddress,
        inputTokens: inserted.inputTokens,
        outputTokens: inserted.outputTokens,
        characters: inserted.characters,
        model: inserted.model,
        cost: inserted.cost,
        duration: inserted.duration
      };
    } catch (error) {
      console.error('[Storage] Failed to create analytics record:', error);
      throw error;
    }
  }

  async getAllAnalytics(startDate?: Date, endDate?: Date): Promise<Analytics[]> {
    try {
      let query = db
        .select()
        .from(analytics)
        .orderBy(desc(analytics.timestamp))
        .limit(1000);

      const conditions = [];
      if (startDate) {
        conditions.push(gte(analytics.timestamp, startDate));
      }
      if (endDate) {
        conditions.push(lte(analytics.timestamp, endDate));
      }

      let results;
      if (conditions.length > 0) {
        results = await query.where(conditions.length === 1 ? conditions[0] : undefined);
      } else {
        results = await query;
      }

      return results.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        type: row.type as 'chat' | 'tts' | 'video',
        ipAddress: row.ipAddress,
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        characters: row.characters,
        model: row.model,
        cost: row.cost,
        duration: row.duration
      }));
    } catch (error) {
      console.error('[Storage] Failed to fetch analytics:', error);
      return [];
    }
  }

  async getAnalyticsSummary(startDate: Date, endDate: Date): Promise<AnalyticsSummary> {
    const records = await this.getAllAnalytics(startDate, endDate);
    
    const chatRecords = records.filter(r => r.type === 'chat');
    const ttsRecords = records.filter(r => r.type === 'tts');
    const videoRecords = records.filter(r => r.type === 'video');
    
    const totalCost = records.reduce((sum, r) => sum + parseFloat(r.cost || '0'), 0);
    const chatCost = chatRecords.reduce((sum, r) => sum + parseFloat(r.cost || '0'), 0);
    const ttsCost = ttsRecords.reduce((sum, r) => sum + parseFloat(r.cost || '0'), 0);
    const videoCost = videoRecords.reduce((sum, r) => sum + parseFloat(r.cost || '0'), 0);
    
    const uniqueIPs = new Set(records.map(r => r.ipAddress));
    const avgDuration = records.length > 0 
      ? records.reduce((sum, r) => sum + r.duration, 0) / records.length 
      : 0;
    
    const totalTokens = records.reduce((sum, r) => 
      sum + (r.inputTokens || 0) + (r.outputTokens || 0), 0
    );
    const totalCharacters = records.reduce((sum, r) => 
      sum + (r.characters || 0), 0
    );
    
    return {
      totalRequests: records.length,
      chatRequests: chatRecords.length,
      ttsRequests: ttsRecords.length,
      videoRequests: videoRecords.length,
      totalCost,
      chatCost,
      ttsCost,
      videoCost,
      uniqueUsers: uniqueIPs.size,
      averageResponseTime: avgDuration,
      totalTokens,
      totalCharacters,
      period: 'custom',
      startDate,
      endDate
    };
  }

  async saveConversation(conversation: Omit<Conversation, 'id' | 'timestamp'>): Promise<Conversation> {
    try {
      const [inserted] = await db
        .insert(conversations)
        .values({
          userQuestion: conversation.userQuestion,
          aiResponse: conversation.aiResponse,
          ipAddress: conversation.ipAddress
        })
        .returning();

      return {
        id: inserted.id,
        timestamp: inserted.timestamp,
        userQuestion: inserted.userQuestion,
        aiResponse: inserted.aiResponse,
        ipAddress: inserted.ipAddress
      };
    } catch (error) {
      console.error('[Storage] Failed to save conversation:', error);
      throw error;
    }
  }

  async getSettings(): Promise<{ companyName: string; avatarName: string }> {
    try {
      const result = await db.select().from(settings).limit(1);
      
      if (result.length === 0) {
        // Create default settings if none exist
        const [inserted] = await db
          .insert(settings)
          .values({
            companyName: 'UK Tax Advisors',
            avatarName: 'Sarah Davies'
          })
          .returning();
        
        return {
          companyName: inserted.companyName,
          avatarName: inserted.avatarName
        };
      }

      return {
        companyName: result[0].companyName,
        avatarName: result[0].avatarName
      };
    } catch (error) {
      console.error('[Storage] Failed to get settings:', error);
      throw error;
    }
  }

  async updateSettings(companyName: string, avatarName: string): Promise<void> {
    try {
      const existing = await db.select().from(settings).limit(1);
      
      if (existing.length === 0) {
        await db.insert(settings).values({
          companyName,
          avatarName
        });
      } else {
        await db
          .update(settings)
          .set({
            companyName,
            avatarName,
            updatedAt: sql`NOW()`
          })
          .where(eq(settings.id, existing[0].id));
      }
    } catch (error) {
      console.error('[Storage] Failed to update settings:', error);
      throw error;
    }
  }
}

export const storage = new SupabaseStorage();
