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

    // Fix any sessions that don't have anonymousId set (migrate existing data)
    await this.fixMissingAnonymousIds();

    // Active users (users who chatted in last 7 days) - count both registered and anonymous users
    const [registeredUsers, anonymousUsers] = await Promise.all([
      // Registered users
      prisma.chatSession.groupBy({
        by: ["userId"],
        where: {
          startedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          },
          userId: {
            not: null
          }
        }
      }),
      // Anonymous users (web sessions, WhatsApp users)
      prisma.chatSession.groupBy({
        by: ["anonymousId"],
        where: {
          startedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          },
          anonymousId: {
            not: null
          }
        }
      })
    ]);

    const activeUsers = registeredUsers.length + anonymousUsers.length;

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
    try {
      // Get recent chat messages to calculate response times
      const recentSessions = await prisma.chatSession.findMany({
        where: {
          startedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        include: {
          messages: {
            orderBy: { timestamp: 'asc' },
            take: 20 // Limit to avoid performance issues
          }
        },
        take: 100 // Limit sessions for performance
      });

      const responseTimes: number[] = [];

      recentSessions.forEach(session => {
        const messages = session.messages;
        
        for (let i = 0; i < messages.length - 1; i++) {
          const userMessage = messages[i];
          const botMessage = messages[i + 1];
          
          // Check if it's a user message followed by a bot message
          if (userMessage.senderType === 'USER' && botMessage.senderType === 'BOT') {
            const responseTime = (new Date(botMessage.timestamp).getTime() - 
                                 new Date(userMessage.timestamp).getTime()) / 1000; // Convert to seconds
            
            // Only include reasonable response times (between 0.1 and 30 seconds)
            if (responseTime > 0.1 && responseTime < 30) {
              responseTimes.push(responseTime);
            }
          }
        }
      });

      if (responseTimes.length === 0) {
        return 2.5; // Default fallback
      }

      // Calculate average response time
      const averageTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      
      // Round to 1 decimal place
      return Math.round(averageTime * 10) / 10;
    } catch (error) {
      console.error('Error calculating response time:', error);
      return 2.5; // Fallback value
    }
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

  // Fix existing chat sessions that don't have anonymousId set
  private async fixMissingAnonymousIds(): Promise<void> {
    try {
      // Find sessions without anonymousId
      const sessionsWithoutAnonymousId = await prisma.chatSession.findMany({
        where: {
          anonymousId: null
        },
        select: {
          id: true,
          context: true
        }
      });

      if (sessionsWithoutAnonymousId.length === 0) {
        return; // No sessions to fix
      }

      console.log(`🔧 Fixing ${sessionsWithoutAnonymousId.length} sessions without anonymousId`);

      // Update sessions in batches
      const batchSize = 50;
      for (let i = 0; i < sessionsWithoutAnonymousId.length; i += batchSize) {
        const batch = sessionsWithoutAnonymousId.slice(i, i + batchSize);
        
        const updatePromises = batch.map(session => {
          const context = session.context as any;
          
          // For WhatsApp sessions, use phone number if available
          if (context?.platform === 'whatsapp' && context?.userInfo?.phone) {
            return prisma.chatSession.update({
              where: { id: session.id },
              data: { anonymousId: context.userInfo.phone }
            });
          } else {
            // For web sessions, use sessionId as anonymousId
            return prisma.chatSession.update({
              where: { id: session.id },
              data: { anonymousId: session.id }
            });
          }
        });

        await Promise.all(updatePromises);
      }

      console.log(`✅ Fixed ${sessionsWithoutAnonymousId.length} sessions with missing anonymousId`);
    } catch (error) {
      console.error('Error fixing missing anonymousIds:', error);
      // Don't throw error to avoid breaking stats calculation
    }
  }
}

export const statsService = new StatsService();
