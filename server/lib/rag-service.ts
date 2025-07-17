// server/lib/rag-service.ts
import { prisma } from "./prisma";
import { KnowledgeEntry } from "@prisma/client";

export interface RAGSearchResult {
  entry: KnowledgeEntry;
  relevanceScore: number;
  matchType: "keyword" | "content" | "title";
}

export class RAGService {
  // Simple text similarity scoring
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const intersection = words1.filter((word) => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];

    return intersection.length / union.length;
  }

  // Extract keywords from user query
  private extractKeywords(query: string): string[] {
    const stopWords = new Set([
      "saya",
      "yang",
      "dan",
      "di",
      "dengan",
      "untuk",
      "pada",
      "dari",
      "ke",
      "dalam",
      "atau",
      "juga",
      "adalah",
      "ini",
      "itu",
      "akan",
      "dapat",
      "sudah",
      "telah",
      "bisa",
      "bisa",
      "apakah",
      "bagaimana",
      "kenapa",
      "mengapa",
      "kapan",
      "dimana"
    ]);

    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));
  }

  // Search knowledge base with RAG approach
  async searchKnowledge(
    query: string,
    limit: number = 5
  ): Promise<RAGSearchResult[]> {
    const keywords = this.extractKeywords(query);

    if (keywords.length === 0) {
      return [];
    }

    try {
      // Search with multiple criteria
      const entries = await prisma.knowledgeEntry.findMany({
        where: {
          AND: [
            { medicalReviewed: true },
            {
              OR: [
                // Keyword matching
                {
                  keywords: {
                    hasSome: keywords
                  }
                },
                // Content matching
                {
                  content: {
                    contains: query,
                    mode: "insensitive"
                  }
                },
                // Title matching
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
        take: limit * 2 // Get more results for better scoring
      });

      // Score and rank results
      const scoredResults: RAGSearchResult[] = entries.map((entry) => {
        let score = 0;
        let matchType: "keyword" | "content" | "title" = "content";

        // Keyword matching score
        const keywordMatches = entry.keywords.filter((k) =>
          keywords.some((q) => k.toLowerCase().includes(q.toLowerCase()))
        );
        const keywordScore =
          keywordMatches.length / Math.max(keywords.length, 1);

        // Title matching score
        const titleScore = this.calculateSimilarity(query, entry.title);

        // Content matching score
        const contentScore = this.calculateSimilarity(query, entry.content);

        // Determine best match type and score
        if (keywordScore > titleScore && keywordScore > contentScore) {
          score = keywordScore;
          matchType = "keyword";
        } else if (titleScore > contentScore) {
          score = titleScore;
          matchType = "title";
        } else {
          score = contentScore;
          matchType = "content";
        }

        // Boost score based on confidence level
        const confidenceBoost =
          entry.confidenceLevel === "HIGH"
            ? 0.3
            : entry.confidenceLevel === "MEDIUM"
            ? 0.1
            : 0;
        score += confidenceBoost;

        return {
          entry,
          relevanceScore: score,
          matchType
        };
      });

      // Sort by relevance score and return top results
      return scoredResults
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit)
        .filter((result) => result.relevanceScore > 0.1); // Filter out very low relevance
    } catch (error) {
      console.error("RAG search error:", error);
      return [];
    }
  }

  // Build contextual knowledge for AI prompt
  async buildKnowledgeContext(
    searchResults: RAGSearchResult[]
  ): Promise<string> {
    if (searchResults.length === 0) {
      return "Tidak ada informasi relevan yang ditemukan di basis pengetahuan.";
    }

    const contextParts = searchResults.map((result, index) => {
      const { entry, relevanceScore, matchType } = result;

      return `
[Referensi ${index + 1}] - Tingkat Kepercayaan: ${entry.confidenceLevel}
Judul: ${entry.title}
Kategori: ${entry.category}
Konten: ${entry.content}
Kata Kunci: ${entry.keywords.join(", ")}
Skor Relevansi: ${(relevanceScore * 100).toFixed(1)}%
Tipe Match: ${matchType}
`;
    });

    return `
KONTEKS PENGETAHUAN MEDIS:
${contextParts.join("\n")}

INSTRUKSI PENGGUNAAN:
- Gunakan informasi di atas untuk memberikan jawaban yang akurat
- Prioritaskan informasi dengan tingkat kepercayaan tinggi
- Jika informasi tidak lengkap, sarankan konsultasi dengan profesional kesehatan
- Selalu berikan disclaimer medis yang tepat
`;
  }

  // Get related entries for context expansion
  async getRelatedEntries(
    entry: KnowledgeEntry,
    limit: number = 3
  ): Promise<KnowledgeEntry[]> {
    const relatedEntries = await prisma.knowledgeEntry.findMany({
      where: {
        AND: [
          { medicalReviewed: true },
          { id: { not: entry.id } },
          {
            OR: [
              { category: entry.category },
              {
                keywords: {
                  hasSome: entry.keywords
                }
              },
              {
                tags: {
                  hasSome: entry.tags
                }
              }
            ]
          }
        ]
      },
      orderBy: { confidenceLevel: "desc" },
      take: limit
    });

    return relatedEntries;
  }

  // Log successful knowledge matches for analytics
  async logKnowledgeUsage(
    sessionId: string,
    query: string,
    results: RAGSearchResult[]
  ): Promise<void> {
    try {
      for (const result of results) {
        await prisma.queryMatch.create({
          data: {
            sessionId,
            query,
            entryId: result.entry.id,
            confidence: result.relevanceScore
          }
        });
      }
    } catch (error) {
      console.error("Knowledge usage logging error:", error);
    }
  }
}

export const ragService = new RAGService();
