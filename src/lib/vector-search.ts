// src/lib/vector-search.ts
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text
  });

  return response.data[0].embedding;
}

export async function semanticSearch(
  query: string,
  entries: any[],
  threshold: number = 0.7
) {
  const queryEmbedding = await getEmbedding(query);

  // Calculate cosine similarity with stored embeddings
  // You'll need to add embedding column to your database

  return entries.filter((entry) => {
    const similarity = cosineSimilarity(queryEmbedding, entry.embedding);
    return similarity > threshold;
  });
}
