// server/routes/knowledge.ts
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticateToken, requireAdmin } from "../middleware/auth";

export const knowledgeRouter = Router();

knowledgeRouter.get("/", async (req, res) => {
  try {
    const { category, search, page = "1", limit = "10" } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    let where: any = {};
    
    // Add category filter
    if (category) {
      where.category = category as string;
    }
    
    // Add search filter
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { content: { contains: searchTerm, mode: 'insensitive' } },
        { keywords: { hasSome: [searchTerm] } }
      ];
    }

    const [entries, total] = await Promise.all([
      prisma.knowledgeEntry.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limitNum
      }),
      prisma.knowledgeEntry.count({ where })
    ]);

    res.json({
      entries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error("Knowledge GET error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

knowledgeRouter.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const data = req.body;
    const { resolveGapId, ...entryData } = data;

    const entry = await prisma.knowledgeEntry.create({
      data: {
        ...entryData,
        createdBy: "admin" // Replace with actual user ID from auth
      }
    });

    // Create initial version
    await prisma.knowledgeVersion.create({
      data: {
        entryId: entry.id,
        content: entry.content,
        version: 1,
        createdBy: "admin"
      }
    });

    // If this entry resolves a knowledge gap, update the gap
    if (resolveGapId) {
      try {
        await prisma.knowledgeGap.update({
          where: { id: resolveGapId },
          data: {
            status: 'RESOLVED',
            resolvedAt: new Date(),
            resolvedBy: "admin",
            needsContent: false,
            updatedAt: new Date(),
            // relatedEntries: {
            //   connect: { id: entry.id }
            // }
          }
        });
        
        console.log(`✅ Knowledge gap ${resolveGapId} resolved by new entry: ${entry.title}`);
      } catch (gapError) {
        console.error("Error updating knowledge gap:", gapError);
        // Don't fail the knowledge creation if gap update fails
      }
    }

    // Auto-evaluate if any other gaps could be resolved by this new entry
    if (entry.medicalReviewed) {
      setTimeout(async () => {
        try {
          await evaluateNewEntryForGaps(entry);
        } catch (evalError) {
          console.error("Error in auto-evaluation:", evalError);
        }
      }, 1000); // Run asynchronously after response
    }

    res.status(201).json(entry);
  } catch (error) {
    console.error("Knowledge POST error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper function to evaluate if new entry resolves existing gaps
async function evaluateNewEntryForGaps(entry: any): Promise<void> {
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

    for (const gap of openGaps) {
      // Check if the new entry matches this gap query
      const relevanceScore = calculateRelevance(gap.query, entry);
      
      if (relevanceScore > 0.7) {
        await prisma.knowledgeGap.update({
          where: { id: gap.id },
          data: {
            status: 'RESOLVED',
            resolvedAt: new Date(),
            resolvedBy: "auto-system",
            needsContent: false,
            updatedAt: new Date(),
            // relatedEntries: {
            //   connect: { id: entry.id }
            // }
          }
        });
        
        console.log(`🤖 Auto-resolved gap: "${gap.query}" with entry: "${entry.title}"`);
      }
    }
  } catch (error) {
    console.error("Auto-evaluation error:", error);
  }
}

// Simple relevance calculation
function calculateRelevance(query: string, entry: any): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const entryText = `${entry.title} ${entry.content} ${entry.keywords.join(' ')}`.toLowerCase();
  
  const matches = queryWords.filter(word => entryText.includes(word)).length;
  return matches / queryWords.length;
}

knowledgeRouter.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const entry = await prisma.knowledgeEntry.update({
      where: { id },
      data: {
        ...data,
        keywords: data.keywords || [],
        tags: data.tags || []
      }
    });

    // Create new version
    const latestVersion = await prisma.knowledgeVersion.findFirst({
      where: { entryId: id },
      orderBy: { version: "desc" }
    });

    await prisma.knowledgeVersion.create({
      data: {
        entryId: id,
        content: data.content,
        version: (latestVersion?.version || 0) + 1,
        createdBy: "admin"
      }
    });

    res.json(entry);
  } catch (error) {
    console.error("Knowledge PUT error:", error);
    res.status(500).json({ error: "Failed to update entry" });
  }
});

knowledgeRouter.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the entry exists
    const existingEntry = await prisma.knowledgeEntry.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            queryMatches: true,
            versions: true
          }
        }
      }
    });

    if (!existingEntry) {
      return res.status(404).json({ error: "Knowledge entry not found" });
    }

    console.log(`🗑️ Deleting knowledge entry: "${existingEntry.title}" (ID: ${id})`);
    console.log(`📊 Entry has ${existingEntry._count.queryMatches} query matches and ${existingEntry._count.versions} versions`);

    // Delete the knowledge entry - related records will cascade automatically
    await prisma.knowledgeEntry.delete({
      where: { id }
    });
    
    console.log(`✅ Successfully deleted knowledge entry: "${existingEntry.title}" and all related data via cascade`);

    res.json({ 
      success: true, 
      message: `Successfully deleted "${existingEntry.title}" and all related data`,
      deletedCounts: {
        queryMatches: existingEntry._count.queryMatches,
        versions: existingEntry._count.versions
      }
    });
  } catch (error) {
    console.error("Knowledge entry deletion error:", error);
    
    // Provide more specific error messages
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ error: "Knowledge entry not found" });
    }
    
    if ((error as any).code === 'P2003') {
      return res.status(400).json({ 
        error: "Cannot delete entry due to existing references. Please contact support." 
      });
    }

    // Log the full error for debugging
    console.error("Full error details:", {
      code: (error as any).code,
      message: error instanceof Error ? error.message : String(error),
      meta: (error as any).meta
    });

    res.status(500).json({ 
      error: "Failed to delete entry. Please try again or contact support if the problem persists." 
    });
  }
});
