import { supabase } from './supabase';

export interface Analytics {
  id: string;
  timestamp: Date;
  type: 'chat' | 'tts';
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
  totalCost: number;
  chatCost: number;
  ttsCost: number;
  uniqueUsers: number;
  averageResponseTime: number;
  totalTokens: number;
  totalCharacters: number;
}

class SupabaseStorage {
  async createAnalyticsRecord(record: Omit<Analytics, 'id' | 'timestamp'>): Promise<Analytics> {
    if (!supabase) {
      console.warn('[Storage] Supabase not available, analytics will not be persisted');
      return {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        ...record
      };
    }

    try {
      const { data, error } = await supabase
        .from('analytics')
        .insert([{
          type: record.type,
          ip_address: record.ipAddress,
          input_tokens: record.inputTokens,
          output_tokens: record.outputTokens,
          character_count: record.characters,
          model: record.model,
          duration_ms: record.duration,
          cost: parseFloat(record.cost)
        }])
        .select()
        .single();

      if (error) {
        console.error('[Storage] Error creating analytics record:', error);
        throw error;
      }

      return {
        id: data.id,
        timestamp: new Date(data.timestamp),
        type: data.type,
        ipAddress: data.ip_address,
        inputTokens: data.input_tokens,
        outputTokens: data.output_tokens,
        characters: data.character_count,
        model: data.model,
        cost: data.cost.toString(),
        duration: data.duration_ms
      };
    } catch (error) {
      console.error('[Storage] Failed to create analytics record:', error);
      return {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        ...record
      };
    }
  }

  async getAllAnalytics(startDate?: Date, endDate?: Date): Promise<Analytics[]> {
    if (!supabase) {
      console.warn('[Storage] Supabase not available');
      return [];
    }

    try {
      let query = supabase
        .from('analytics')
        .select('*')
        .order('timestamp', { ascending: false });

      if (startDate) {
        query = query.gte('timestamp', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('timestamp', endDate.toISOString());
      }

      const { data, error } = await query.limit(1000);

      if (error) {
        console.error('[Storage] Error fetching analytics:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        timestamp: new Date(row.timestamp),
        type: row.type,
        ipAddress: row.ip_address,
        inputTokens: row.input_tokens,
        outputTokens: row.output_tokens,
        characters: row.character_count,
        model: row.model,
        cost: row.cost.toString(),
        duration: row.duration_ms
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
    
    const totalCost = records.reduce((sum, r) => sum + parseFloat(r.cost || '0'), 0);
    const chatCost = chatRecords.reduce((sum, r) => sum + parseFloat(r.cost || '0'), 0);
    const ttsCost = ttsRecords.reduce((sum, r) => sum + parseFloat(r.cost || '0'), 0);
    
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
      totalCost,
      chatCost,
      ttsCost,
      uniqueUsers: uniqueIPs.size,
      averageResponseTime: avgDuration,
      totalTokens,
      totalCharacters
    };
  }
}

export const storage = new SupabaseStorage();
