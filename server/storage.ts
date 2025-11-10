// Simple in-memory storage - no database required
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
  avgResponseTime: number;
}

class SimpleStorage {
  private analytics: Analytics[] = [];
  private nextId = 1;

  async createAnalyticsRecord(record: Omit<Analytics, 'id' | 'timestamp'>): Promise<Analytics> {
    const analyticsRecord: Analytics = {
      id: (this.nextId++).toString(),
      timestamp: new Date(),
      ...record
    };
    this.analytics.push(analyticsRecord);
    return analyticsRecord;
  }

  async getAllAnalytics(startDate?: Date, endDate?: Date): Promise<Analytics[]> {
    let filtered = this.analytics;
    
    if (startDate) {
      filtered = filtered.filter(r => r.timestamp >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(r => r.timestamp <= endDate);
    }
    
    return filtered;
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
    
    return {
      totalRequests: records.length,
      chatRequests: chatRecords.length,
      ttsRequests: ttsRecords.length,
      totalCost,
      chatCost,
      ttsCost,
      uniqueUsers: uniqueIPs.size,
      avgResponseTime: avgDuration
    };
  }
}

export const storage = new SimpleStorage();
