// server/lib/stats-service.ts
import { prisma } from "./prisma";

export interface DashboardStats {
  totalChats: number;
  totalKnowledgeEntries: number;
  totalResponses: number;
  knowledgeGaps: number;
  todayChats: number;
  yesterdayChats: number;
  activeUsers: number;
  averageResponseTime: number;
}

export interface ChatVolumeData {
  date: string;
  count: number;
}

export interface KnowledgeGapData {
  query: string;
  frequency: number;
  needsContent: boolean;
  createdAt: Date;
}

export interface ResponseQualityData {
  helpful: number;
  notHelpful: number;
  averageConfidence: number;
  totalResponses: number;
}

export class StatsService {
  async getDashboardStats(): Promise<DashboardStats> {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const startOfYesterday = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate()
    );

    const [
      totalChats,
      totalKnowledgeEntries,
      totalResponses,
      knowledgeGaps,
      todayChats,
      yesterdayChats
    ] = await Promise.all([
      // Total chat sessions
      prisma.chatSession.count(),

      // Total knowledge entries
      prisma.knowledgeEntry.count({
        where: { medicalReviewed: true }
      }),

      // Total bot responses
      prisma.chatMessage.count({
        where: { senderType: "BOT" }
      }),

      // Knowledge gaps
      prisma.knowledgeGap.count({
        where: { needsContent: true }
      }),

      // Today's chats
      prisma.chatSession.count({
        where: {
          startedAt: {
            gte: startOfToday
          }
        }
      }),

      // Yesterday's chats
      prisma.chatSession.count({
        where: {
          startedAt: {
            gte: startOfYesterday,
            lt: startOfToday
          }
        }
      })
    ]);

    // Active users (users who chatted in last 7 days) - using groupBy instead of distinct
    const activeUsersData = await prisma.chatSession.groupBy({
      by: ["userId"],
      where: {
        startedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        userId: {
          not: null
        }
      }
    });

    const activeUsers = activeUsersData.length;

    // Calculate average response time (simplified)
    const averageResponseTime = await this.getAverageResponseTime();

    return {
      totalChats,
      totalKnowledgeEntries,
      totalResponses,
      knowledgeGaps,
      todayChats,
      yesterdayChats,
      activeUsers,
      averageResponseTime
    };
  }

  async getChatVolumeData(days: number = 30): Promise<ChatVolumeData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get raw chat data
    const chatSessions = await prisma.chatSession.findMany({
      where: {
        startedAt: {
          gte: startDate
        }
      },
      select: {
        startedAt: true
      }
    });

    // Group by date manually
    const volumeMap = new Map<string, number>();

    chatSessions.forEach((session) => {
      const date = session.startedAt.toISOString().split("T")[0];
      volumeMap.set(date, (volumeMap.get(date) || 0) + 1);
    });

    // Fill in missing dates with 0
    const result: ChatVolumeData[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      result.push({
        date: dateStr,
        count: volumeMap.get(dateStr) || 0
      });
    }

    return result;
  }

  async getKnowledgeGaps(limit: number = 10): Promise<KnowledgeGapData[]> {
    const gaps = await prisma.knowledgeGap.findMany({
      where: { needsContent: true },
      orderBy: { frequency: "desc" },
      take: limit
    });

    return gaps.map((gap) => ({
      query: gap.query,
      frequency: gap.frequency,
      needsContent: gap.needsContent,
      createdAt: gap.createdAt
    }));
  }

  async getResponseQuality(): Promise<ResponseQualityData> {
    const [helpful, notHelpful, avgConfidence, totalResponses] =
      await Promise.all([
        // Helpful responses
        prisma.queryMatch.count({
          where: { wasHelpful: true }
        }),

        // Not helpful responses
        prisma.queryMatch.count({
          where: { wasHelpful: false }
        }),

        // Average confidence
        prisma.queryMatch.aggregate({
          _avg: { confidence: true }
        }),

        // Total responses
        prisma.queryMatch.count()
      ]);

    return {
      helpful,
      notHelpful,
      averageConfidence: avgConfidence._avg.confidence || 0,
      totalResponses
    };
  }

  async getTopQueries(
    limit: number = 10
  ): Promise<{ query: string; count: number }[]> {
    // Get raw query match data and group manually
    const queryMatches = await prisma.queryMatch.findMany({
      select: {
        query: true
      }
    });

    // Count queries manually
    const queryCount = new Map<string, number>();
    queryMatches.forEach((match) => {
      const query = match.query.toLowerCase().trim();
      queryCount.set(query, (queryCount.get(query) || 0) + 1);
    });

    // Convert to array and sort
    const sortedQueries = Array.from(queryCount.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return sortedQueries;
  }

  async getCategoryDistribution(): Promise<
    { category: string; count: number }[]
  > {
    // Get categories manually and count
    const entries = await prisma.knowledgeEntry.findMany({
      where: { medicalReviewed: true },
      select: {
        category: true
      }
    });

    // Count categories manually
    const categoryCount = new Map<string, number>();
    entries.forEach((entry) => {
      const category = entry.category;
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
    });

    // Convert to array
    return Array.from(categoryCount.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  private async getAverageResponseTime(): Promise<number> {
    // This is a simplified calculation
    // In a real implementation, you'd track actual response times
    return 2.5; // seconds
  }

  async recordQueryMatch(
    sessionId: string,
    query: string,
    entryId: string,
    confidence: number
  ): Promise<void> {
    await prisma.queryMatch.create({
      data: {
        sessionId,
        query,
        entryId,
        confidence
      }
    });
  }

  async updateQueryMatchFeedback(
    queryMatchId: string,
    wasHelpful: boolean
  ): Promise<void> {
    await prisma.queryMatch.update({
      where: { id: queryMatchId },
      data: { wasHelpful }
    });
  }
}

export const statsService = new StatsService();
