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
    await prisma.knowledgeGap.upsert({
      where: { query },
      update: {
        frequency: { increment: 1 },
        updatedAt: new Date()
      },
      create: {
        query,
        frequency: 1,
        needsContent: true
      }
    });
  } catch (error) {
    console.error("Knowledge gap logging error:", error);
  }
}
