// server/routes/knowledge-gaps.ts
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { ragService } from "../lib/rag-service";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { semanticSimilarityService } from "../lib/semantic-similarity";

export const knowledgeGapsRouter = Router();

// All routes require admin authentication
knowledgeGapsRouter.use(authenticateToken);
knowledgeGapsRouter.use(requireAdmin);

// Get knowledge gaps with filtering
knowledgeGapsRouter.get("/", async (req, res) => {
  try {
    const { filter = 'open', limit = '20', page = '1' } = req.query;
    const limitNum = parseInt(limit as string);
    const pageNum = parseInt(page as string);
    const skip = (pageNum - 1) * limitNum;

    let whereClause: any = {};
    
    switch (filter) {
      case 'open':
        whereClause = { 
          needsContent: true, 
          OR: [
            { status: null }, 
            { status: 'OPEN' }
          ] 
        };
        break;
      case 'in_progress':
        whereClause = { status: 'IN_PROGRESS' };
        break;
      case 'resolved':
        whereClause = { status: 'RESOLVED' };
        break;
      case 'all':
      default:
        // No additional filter
        break;
    }

    const [gaps, total] = await Promise.all([
      prisma.knowledgeGap.findMany({
        where: whereClause,
        orderBy: [
          { frequency: 'desc' },
          { updatedAt: 'desc' }
        ],
        skip,
        take: limitNum,
        // No relations for now
        // include: {
        //   _count: {
        //     select: {
        //       relatedEntries: true
        //     }
        //   }
        // }
      }),
      prisma.knowledgeGap.count({ where: whereClause })
    ]);

    // Enhance gaps with related entries
    const enhancedGaps = await Promise.all(
      gaps.map(async (gap) => {
        // Find potentially related knowledge entries
        const searchResults = await ragService.searchKnowledge(gap.query, 3);
        
        return {
          ...gap,
          relatedEntries: searchResults.map(result => ({
            id: result.entry.id,
            title: result.entry.title,
            category: result.entry.category,
            relevanceScore: result.relevanceScore
          }))
        };
      })
    );

    res.json({
      gaps: enhancedGaps,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error("Knowledge gaps fetch error:", error);
    res.status(500).json({ error: "Failed to fetch knowledge gaps" });
  }
});

// Get knowledge gap statistics
knowledgeGapsRouter.get("/stats", async (_req, res) => {
  try {
    const [
      totalGaps,
      resolvedGaps,
      inProgressGaps,
      openGaps,
      averageFrequency,
      topQueries,
      resolutionTimes
    ] = await Promise.all([
      // Total gaps
      prisma.knowledgeGap.count(),
      
      // Resolved gaps
      prisma.knowledgeGap.count({
        where: { status: 'RESOLVED' }
      }),
      
      // In progress gaps
      prisma.knowledgeGap.count({
        where: { status: 'IN_PROGRESS' }
      }),
      
      // Open gaps
      prisma.knowledgeGap.count({
        where: { 
          OR: [
            { status: 'OPEN' },
            { status: null }
          ]
        }
      }),
      
      // Average frequency
      prisma.knowledgeGap.aggregate({
        _avg: { frequency: true }
      }),
      
      // Top queries by frequency
      prisma.knowledgeGap.findMany({
        orderBy: { frequency: 'desc' },
        take: 10,
        select: {
          query: true,
          frequency: true,
          status: true
        }
      }),
      
      // Get resolved gaps for resolution time calculation
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

    // Calculate average resolution time in hours
    let averageResolutionTime = 0;
    if (resolutionTimes.length > 0) {
      const totalResolutionTime = resolutionTimes.reduce((sum, gap) => {
        const diffMs = new Date(gap.resolvedAt!).getTime() - new Date(gap.createdAt).getTime();
        return sum + (diffMs / (1000 * 60 * 60)); // Convert to hours
      }, 0);
      averageResolutionTime = Math.round(totalResolutionTime / resolutionTimes.length);
    }

    // Analyze categories from queries
    const categoryAnalysis = await analyzeGapCategories(topQueries.map(q => q.query));

    res.json({
      totalGaps,
      resolvedGaps,
      inProgressGaps,
      openGaps,
      averageFrequency: Math.round(averageFrequency._avg.frequency || 0),
      averageResolutionTime,
      topQueries,
      topCategories: categoryAnalysis
    });
  } catch (error) {
    console.error("Knowledge gap stats error:", error);
    res.status(500).json({ error: "Failed to fetch knowledge gap statistics" });
  }
});

// Update knowledge gap status
knowledgeGapsRouter.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo } = req.body;

    // Convert frontend status to database enum
    let dbStatus: string;
    switch (status) {
      case 'open':
        dbStatus = 'OPEN';
        break;
      case 'in_progress':
        dbStatus = 'IN_PROGRESS';
        break;
      case 'resolved':
        dbStatus = 'RESOLVED';
        break;
      default:
        return res.status(400).json({ error: "Invalid status" });
    }

    const updateData: any = { 
      status: dbStatus,
      updatedAt: new Date()
    };

    if (assignedTo) {
      updateData.assignedTo = assignedTo;
    }

    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
      updateData.needsContent = false;
    } else if (status === 'open') {
      updateData.assignedTo = null;
      updateData.resolvedAt = null;
      updateData.needsContent = true;
    }

    const updatedGap = await prisma.knowledgeGap.update({
      where: { id },
      data: updateData
    });

    res.json(updatedGap);
  } catch (error) {
    console.error("Gap status update error:", error);
    res.status(500).json({ error: "Failed to update gap status" });
  }
});

// Evaluate if a knowledge gap has been resolved by new content
knowledgeGapsRouter.post("/:id/evaluate", async (req, res) => {
  try {
    const { id } = req.params;

    const gap = await prisma.knowledgeGap.findUnique({
      where: { id }
    });

    if (!gap) {
      return res.status(404).json({ error: "Knowledge gap not found" });
    }

    // Search for content that might resolve this gap
    const searchResults = await ragService.searchKnowledge(gap.query, 5);

    // Check if we have good matches (relevance score > 0.7)
    const highQualityMatches = searchResults.filter(result => result.relevanceScore > 0.7);

    if (highQualityMatches.length > 0) {
      // Gap appears to be resolved
      await prisma.knowledgeGap.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          needsContent: false,
          updatedAt: new Date()
        }
      });

      // Log the resolution
      await logGapResolution(gap.id, gap.query, highQualityMatches);

      res.json({
        resolved: true,
        matchCount: highQualityMatches.length,
        bestMatch: highQualityMatches[0]
      });
    } else {
      res.json({
        resolved: false,
        matchCount: searchResults.length,
        message: "No high-quality matches found. Gap remains open."
      });
    }
  } catch (error) {
    console.error("Gap evaluation error:", error);
    res.status(500).json({ error: "Failed to evaluate gap resolution" });
  }
});

// Bulk evaluate all open gaps
knowledgeGapsRouter.post("/evaluate-all", async (_req, res) => {
  try {
    const openGaps = await prisma.knowledgeGap.findMany({
      where: {
        OR: [
          { status: 'OPEN' },
          { status: null }
        ],
        needsContent: true
      }
    });

    let resolvedCount = 0;
    const results = [];

    for (const gap of openGaps) {
      try {
        const searchResults = await ragService.searchKnowledge(gap.query, 5);
        const highQualityMatches = searchResults.filter(result => result.relevanceScore > 0.7);

        if (highQualityMatches.length > 0) {
          await prisma.knowledgeGap.update({
            where: { id: gap.id },
            data: {
              status: 'RESOLVED',
              resolvedAt: new Date(),
              needsContent: false,
              updatedAt: new Date()
            }
          });

          await logGapResolution(gap.id, gap.query, highQualityMatches);
          resolvedCount++;
        }

        results.push({
          gapId: gap.id,
          query: gap.query,
          resolved: highQualityMatches.length > 0,
          matchCount: highQualityMatches.length
        });
      } catch (error) {
        console.error(`Error evaluating gap ${gap.id}:`, error);
      }
    }

    res.json({
      message: `Evaluated ${openGaps.length} gaps, resolved ${resolvedCount}`,
      totalEvaluated: openGaps.length,
      resolvedCount,
      results
    });
  } catch (error) {
    console.error("Bulk evaluation error:", error);
    res.status(500).json({ error: "Failed to perform bulk evaluation" });
  }
});

// Helper function to analyze gap categories
async function analyzeGapCategories(queries: string[]): Promise<Array<{ category: string; count: number }>> {
  const categoryCount: Record<string, number> = {};

  queries.forEach(query => {
    const lowerQuery = query.toLowerCase();
    let category = 'general';

    if (lowerQuery.includes('sakit') || lowerQuery.includes('nyeri') || lowerQuery.includes('demam')) {
      category = 'symptoms';
    } else if (lowerQuery.includes('obat') || lowerQuery.includes('pengobatan') || lowerQuery.includes('terapi')) {
      category = 'treatments';
    } else if (lowerQuery.includes('darurat') || lowerQuery.includes('emergency')) {
      category = 'emergency';
    } else if (lowerQuery.includes('penyakit') || lowerQuery.includes('kondisi')) {
      category = 'conditions';
    }

    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });

  return Object.entries(categoryCount)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

// Merge similar knowledge gaps
knowledgeGapsRouter.post("/merge-duplicates", async (_req, res) => {
  try {
    const openGaps = await prisma.knowledgeGap.findMany({
      where: {
        OR: [
          { status: 'OPEN' },
          { status: null }
        ]
      },
      orderBy: { frequency: 'desc' }
    });

    let mergedCount = 0;
    const mergeResults = [];
    const processedIds = new Set<string>();

    for (const gap of openGaps) {
      if (processedIds.has(gap.id)) continue;

      const otherGaps = openGaps.filter(g => 
        g.id !== gap.id && !processedIds.has(g.id)
      );
      
      const otherQueries = otherGaps.map(g => g.query);
      const similarQuestions = semanticSimilarityService.findSimilarQuestions(
        gap.query,
        otherQueries,
        0.8 // High threshold for merging
      );

      if (similarQuestions.length > 0) {
        // Find the gap objects for similar questions
        const similarGaps = otherGaps.filter(g => 
          similarQuestions.some(sq => sq.query === g.query)
        );

        // Merge similar gaps into the current one
        let totalFrequency = gap.frequency;
        for (const similarGap of similarGaps) {
          totalFrequency += similarGap.frequency;
          processedIds.add(similarGap.id);
        }

        // Update the main gap with combined frequency
        await prisma.knowledgeGap.update({
          where: { id: gap.id },
          data: {
            frequency: totalFrequency,
            updatedAt: new Date()
          }
        });

        // Delete the similar gaps
        await prisma.knowledgeGap.deleteMany({
          where: {
            id: { in: similarGaps.map(g => g.id) }
          }
        });

        mergeResults.push({
          mainQuery: gap.query,
          mergedQueries: similarQuestions.map(sq => ({
            query: sq.query,
            similarity: sq.similarity
          })),
          newFrequency: totalFrequency
        });

        mergedCount += similarGaps.length;
        console.log(`🔗 Merged ${similarGaps.length} similar gaps into: "${gap.query}"`);
      }

      processedIds.add(gap.id);
    }

    res.json({
      message: `Successfully merged ${mergedCount} duplicate gaps`,
      mergedCount,
      results: mergeResults
    });
  } catch (error) {
    console.error("Gap merge error:", error);
    res.status(500).json({ error: "Failed to merge duplicate gaps" });
  }
});

// Check for similar gaps for a specific query
knowledgeGapsRouter.post("/check-similarity", async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: "Query is required" });
    }

    const existingGaps = await prisma.knowledgeGap.findMany({
      where: {
        OR: [
          { status: 'OPEN' },
          { status: null }
        ]
      },
      select: { id: true, query: true, frequency: true }
    });

    const existingQueries = existingGaps.map(gap => gap.query);
    const similarQuestions = semanticSimilarityService.findSimilarQuestions(
      query,
      existingQueries,
      0.6 // Lower threshold for showing potential duplicates
    );

    const enhancedSimilar = similarQuestions.map(sq => {
      const gap = existingGaps.find(g => g.query === sq.query);
      return {
        ...sq,
        id: gap?.id,
        frequency: gap?.frequency
      };
    });

    res.json({
      query,
      similarQuestions: enhancedSimilar,
      hasSimilar: enhancedSimilar.length > 0
    });
  } catch (error) {
    console.error("Similarity check error:", error);
    res.status(500).json({ error: "Failed to check similarity" });
  }
});

// Helper function to log gap resolution
async function logGapResolution(_gapId: string, query: string, matches: any[]): Promise<void> {
  try {
    // You could create a separate table for gap resolutions if needed
    console.log(`✅ Gap resolved: "${query}" with ${matches.length} matches`);
    
    // Optionally log to a gap_resolutions table
    // await prisma.gapResolution.create({
    //   data: {
    //     gapId,
    //     query,
    //     resolvedAt: new Date(),
    //     matchCount: matches.length,
    //     bestMatchId: matches[0]?.entry?.id
    //   }
    // });
  } catch (error) {
    console.error("Error logging gap resolution:", error);
  }
}