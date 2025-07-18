// server/lib/knowledge-search.ts
import { prisma } from "./prisma.js";

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
    // Use findFirst + create instead of upsert with non-unique field
    const existing = await prisma.knowledgeGap.findFirst({
      where: { query }
    });

    if (existing) {
      await prisma.knowledgeGap.update({
        where: { id: existing.id },
        data: {
          frequency: { increment: 1 },
          updatedAt: new Date()
        }
      });
    } else {
      await prisma.knowledgeGap.create({
        data: {
          query,
          frequency: 1,
          needsContent: true
        }
      });
    }
  } catch (error) {
    console.error("Knowledge gap logging error:", error);
  }
}
