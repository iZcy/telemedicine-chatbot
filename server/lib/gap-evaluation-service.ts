// server/lib/gap-evaluation-service.ts
import { prisma } from "./prisma";
import { ragService } from "./rag-service";

export class GapEvaluationService {
  private evaluationThreshold = 0.7; // Minimum relevance score to consider a gap resolved
  private batchSize = 10; // Process gaps in batches to avoid overwhelming the system
  private periodicInterval: NodeJS.Timeout | null = null; // Store interval reference for cleanup

  // Auto-evaluate all open gaps against current knowledge base
  async evaluateAllOpenGaps(): Promise<{
    evaluated: number;
    resolved: number;
    results: Array<{
      gapId: string;
      query: string;
      resolved: boolean;
      bestMatch?: any;
    }>;
  }> {
    try {
      console.log("🔍 Starting bulk gap evaluation...");

      const openGaps = await prisma.knowledgeGap.findMany({
        where: {
          OR: [
            { status: 'OPEN' },
            { status: null }
          ],
          needsContent: true
        },
        orderBy: { frequency: 'desc' } // Prioritize by frequency
      });

      console.log(`📊 Found ${openGaps.length} open gaps to evaluate`);

      const results = [];
      let resolvedCount = 0;

      // Process in batches to avoid overwhelming the system
      for (let i = 0; i < openGaps.length; i += this.batchSize) {
        const batch = openGaps.slice(i, i + this.batchSize);
        
        for (const gap of batch) {
          try {
            const evaluationResult = await this.evaluateGap(gap.id, gap.query);
            results.push(evaluationResult);
            
            if (evaluationResult.resolved) {
              resolvedCount++;
            }

            // Small delay to prevent overwhelming the RAG service
            await this.sleep(100);
          } catch (error) {
            console.error(`Error evaluating gap ${gap.id}:`, error);
            results.push({
              gapId: gap.id,
              query: gap.query,
              resolved: false,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }

        // Longer delay between batches
        if (i + this.batchSize < openGaps.length) {
          await this.sleep(1000);
        }
      }

      console.log(`✅ Evaluation complete: ${resolvedCount}/${openGaps.length} gaps resolved`);

      return {
        evaluated: openGaps.length,
        resolved: resolvedCount,
        results
      };
    } catch (error) {
      console.error("Bulk gap evaluation error:", error);
      throw error;
    }
  }

  // Evaluate a specific gap
  async evaluateGap(gapId: string, query: string): Promise<{
    gapId: string;
    query: string;
    resolved: boolean;
    bestMatch?: any;
    matchCount?: number;
  }> {
    try {
      // Search for content that might resolve this gap
      const searchResults = await ragService.searchKnowledge(query, 5);

      // Check if we have good matches
      const highQualityMatches = searchResults.filter(
        result => result.relevanceScore > this.evaluationThreshold
      );

      if (highQualityMatches.length > 0) {
        // Gap appears to be resolved
        await prisma.knowledgeGap.update({
          where: { id: gapId },
          data: {
            status: 'RESOLVED',
            resolvedAt: new Date(),
            resolvedBy: 'auto-system',
            needsContent: false,
            updatedAt: new Date()
          }
        });

        // Log the resolution
        await this.logGapResolution(gapId, query, highQualityMatches);

        return {
          gapId,
          query,
          resolved: true,
          bestMatch: {
            title: highQualityMatches[0].entry.title,
            category: highQualityMatches[0].entry.category,
            relevanceScore: highQualityMatches[0].relevanceScore
          },
          matchCount: highQualityMatches.length
        };
      } else {
        return {
          gapId,
          query,
          resolved: false,
          matchCount: searchResults.length
        };
      }
    } catch (error) {
      console.error(`Error evaluating gap ${gapId}:`, error);
      throw error;
    }
  }

  // Evaluate gaps when new knowledge is added
  async evaluateGapsForNewEntry(entryId: string): Promise<{
    evaluated: number;
    resolved: number;
    details: Array<{
      gapId: string;
      query: string;
      resolved: boolean;
    }>;
  }> {
    try {
      console.log(`🔍 Evaluating gaps for new entry: ${entryId}`);

      const entry = await prisma.knowledgeEntry.findUnique({
        where: { id: entryId }
      });

      if (!entry || !entry.medicalReviewed) {
        return { evaluated: 0, resolved: 0, details: [] };
      }

      // Get all open gaps
      const openGaps = await prisma.knowledgeGap.findMany({
        where: {
          OR: [
            { status: 'OPEN' },
            { status: null }
          ],
          needsContent: true
        }
      });

      const details = [];
      let resolvedCount = 0;

      for (const gap of openGaps) {
        // Calculate relevance between gap query and new entry
        const relevanceScore = this.calculateEntryRelevance(gap.query, entry);

        if (relevanceScore > this.evaluationThreshold) {
          // Mark gap as resolved
          await prisma.knowledgeGap.update({
            where: { id: gap.id },
            data: {
              status: 'RESOLVED',
              resolvedAt: new Date(),
              resolvedBy: 'auto-entry',
              needsContent: false,
              updatedAt: new Date()
            }
          });

          await this.logGapResolution(gap.id, gap.query, [{
            entry,
            relevanceScore,
            matchType: 'auto-entry'
          }]);

          details.push({
            gapId: gap.id,
            query: gap.query,
            resolved: true,
            relevanceScore
          });

          resolvedCount++;
          console.log(`🎯 Auto-resolved: "${gap.query}" with "${entry.title}"`);
        } else {
          details.push({
            gapId: gap.id,
            query: gap.query,
            resolved: false,
            relevanceScore
          });
        }
      }

      console.log(`✅ Entry evaluation complete: ${resolvedCount}/${openGaps.length} gaps resolved`);

      return {
        evaluated: openGaps.length,
        resolved: resolvedCount,
        details
      };
    } catch (error) {
      console.error("Entry gap evaluation error:", error);
      throw error;
    }
  }

  // Calculate relevance between a query and a knowledge entry
  private calculateEntryRelevance(query: string, entry: any): number {
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    // Combine all searchable text from the entry
    const entryText = [
      entry.title,
      entry.content,
      ...(entry.keywords || [])
    ].join(' ').toLowerCase();

    // Count direct word matches
    const directMatches = queryWords.filter(word => entryText.includes(word)).length;
    const directScore = directMatches / queryWords.length;

    // Add bonus for title matches (more important)
    const titleMatches = queryWords.filter(word => 
      entry.title.toLowerCase().includes(word)
    ).length;
    const titleBonus = (titleMatches / queryWords.length) * 0.3;

    // Add bonus for keyword matches
    const keywordMatches = queryWords.filter(word =>
      entry.keywords.some((keyword: string) => 
        keyword.toLowerCase().includes(word)
      )
    ).length;
    const keywordBonus = (keywordMatches / queryWords.length) * 0.2;

    return Math.min(directScore + titleBonus + keywordBonus, 1.0);
  }

  // Schedule periodic gap evaluation
  startPeriodicEvaluation(intervalHours: number = 6): void {
    // Clear existing interval if any
    if (this.periodicInterval) {
      clearInterval(this.periodicInterval);
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    console.log(`🕒 Starting periodic gap evaluation every ${intervalHours} hours`);
    
    this.periodicInterval = setInterval(async () => {
      try {
        console.log("🔄 Running scheduled gap evaluation...");
        const result = await this.evaluateAllOpenGaps();
        console.log(`📈 Scheduled evaluation: ${result.resolved}/${result.evaluated} gaps resolved`);
      } catch (error) {
        console.error("Scheduled gap evaluation error:", error);
      }
    }, intervalMs);
  }

  // Stop periodic evaluation
  stopPeriodicEvaluation(): void {
    if (this.periodicInterval) {
      clearInterval(this.periodicInterval);
      this.periodicInterval = null;
      console.log("🛑 Stopped periodic gap evaluation");
    }
  }

  // Cleanup method for proper shutdown
  cleanup(): void {
    this.stopPeriodicEvaluation();
    console.log("🧹 Gap evaluation service cleanup completed");
  }

  // Get gap evaluation statistics
  async getEvaluationStats(): Promise<{
    totalGaps: number;
    openGaps: number;
    resolvedGaps: number;
    autoResolvedGaps: number;
    averageResolutionTime: number;
    resolutionRate: number;
  }> {
    try {
      const [
        totalGaps,
        openGaps,
        resolvedGaps,
        autoResolvedGaps,
        resolutionTimes
      ] = await Promise.all([
        prisma.knowledgeGap.count(),
        
        prisma.knowledgeGap.count({
          where: {
            OR: [
              { status: 'OPEN' },
              { status: null }
            ]
          }
        }),
        
        prisma.knowledgeGap.count({
          where: { status: 'RESOLVED' }
        }),
        
        prisma.knowledgeGap.count({
          where: {
            status: 'RESOLVED',
            resolvedBy: { in: ['auto-system', 'auto-entry'] }
          }
        }),
        
        prisma.knowledgeGap.findMany({
          where: {
            status: 'RESOLVED',
            resolvedAt: { not: null }
          },
          select: {
            createdAt: true,
            resolvedAt: true
          }
        })
      ]);

      // Calculate average resolution time
      let averageResolutionTime = 0;
      if (resolutionTimes.length > 0) {
        const totalTime = resolutionTimes.reduce((sum, gap) => {
          const diffMs = new Date(gap.resolvedAt!).getTime() - new Date(gap.createdAt).getTime();
          return sum + (diffMs / (1000 * 60 * 60)); // Convert to hours
        }, 0);
        averageResolutionTime = totalTime / resolutionTimes.length;
      }

      const resolutionRate = totalGaps > 0 ? (resolvedGaps / totalGaps) * 100 : 0;

      return {
        totalGaps,
        openGaps,
        resolvedGaps,
        autoResolvedGaps,
        averageResolutionTime: Math.round(averageResolutionTime * 10) / 10,
        resolutionRate: Math.round(resolutionRate * 10) / 10
      };
    } catch (error) {
      console.error("Gap evaluation stats error:", error);
      throw error;
    }
  }

  // Helper methods
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async logGapResolution(_gapId: string, query: string, matches: any[]): Promise<void> {
    try {
      console.log(`✅ Gap resolved: "${query}" with ${matches.length} matches`);
      
      // Could log to a separate resolution tracking table if needed
      // await prisma.gapResolution.create({
      //   data: {
      //     gapId,
      //     query,
      //     resolvedAt: new Date(),
      //     matchCount: matches.length,
      //     bestMatchId: matches[0]?.entry?.id,
      //     resolvedBy: 'auto-system'
      //   }
      // });
    } catch (error) {
      console.error("Error logging gap resolution:", error);
    }
  }

  // Update evaluation threshold
  setEvaluationThreshold(threshold: number): void {
    if (threshold >= 0 && threshold <= 1) {
      this.evaluationThreshold = threshold;
      console.log(`🎯 Updated evaluation threshold to ${threshold}`);
    } else {
      throw new Error("Threshold must be between 0 and 1");
    }
  }

  // Get current configuration
  getConfiguration(): {
    evaluationThreshold: number;
    batchSize: number;
  } {
    return {
      evaluationThreshold: this.evaluationThreshold,
      batchSize: this.batchSize
    };
  }
}

export const gapEvaluationService = new GapEvaluationService();