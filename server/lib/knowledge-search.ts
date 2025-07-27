// server/lib/knowledge-search.ts
import { prisma } from "./prisma.js";
import { semanticSimilarityService } from "./semantic-similarity.js";

export async function searchKnowledge(
  query: string,
  limit: number = 5
): Promise<any[]> {
  const keywords = query
    .toLowerCase()
    .split(" ")
    .filter((word) => word.length > 2);

  try {
    const results = await prisma.knowledgeEntry.findMany({
      where: {
        AND: [
          { medicalReviewed: true },
          {
            OR: [
              {
                keywords: {
                  hasSome: keywords
                }
              },
              {
                content: {
                  contains: query,
                  mode: "insensitive"
                }
              },
              {
                title: {
                  contains: query,
                  mode: "insensitive"
                }
              }
            ]
          }
        ]
      },
      orderBy: [{ confidenceLevel: "desc" }, { updatedAt: "desc" }],
      take: limit
    });

    return results;
  } catch (error) {
    console.error("Knowledge search error:", error);
    return [];
  }
}

export async function logKnowledgeGap(query: string): Promise<void> {
  try {
    // First check for exact match
    const exactMatch = await prisma.knowledgeGap.findFirst({
      where: { query }
    });

    if (exactMatch) {
      await prisma.knowledgeGap.update({
        where: { id: exactMatch.id },
        data: {
          frequency: { increment: 1 },
          updatedAt: new Date()
        }
      });
      return;
    }

    // If no exact match, check for semantic similarity with existing gaps
    const existingGaps = await prisma.knowledgeGap.findMany({
      where: {
        OR: [
          { status: 'OPEN' },
          { status: null }
        ]
      },
      select: { id: true, query: true }
    });

    // Find semantically similar questions
    const existingQueries = existingGaps.map(gap => gap.query);
    const similarQuestions = semanticSimilarityService.findSimilarQuestions(
      query, 
      existingQueries, 
      0.75 // Threshold for considering questions as duplicates
    );

    if (similarQuestions.length > 0) {
      // Update the most similar existing gap
      const mostSimilar = similarQuestions[0];
      const existingGap = existingGaps.find(gap => gap.query === mostSimilar.query);
      
      if (existingGap) {
        await prisma.knowledgeGap.update({
          where: { id: existingGap.id },
          data: {
            frequency: { increment: 1 },
            updatedAt: new Date()
          }
        });
        
        console.log(`📊 Similar question found: "${query}" merged with "${mostSimilar.query}" (similarity: ${(mostSimilar.similarity * 100).toFixed(1)}%)`);
        return;
      }
    }

    // Create new gap if no similar questions found
    await prisma.knowledgeGap.create({
      data: {
        query,
        frequency: 1,
        needsContent: true
      }
    });
    
    console.log(`📝 New knowledge gap created: "${query}"`);
  } catch (error) {
    console.error("Knowledge gap logging error:", error);
  }
}
