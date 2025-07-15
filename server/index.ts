// server/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { chatRouter } from "./routes/chat.js";
import { knowledgeRouter } from "./routes/knowledge.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});

app.use(limiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/chat", chatRouter);
app.use("/api/knowledge", knowledgeRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// server/routes/chat.ts
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { generateChatResponse, extractSymptoms } from "../lib/openai.js";
import { searchKnowledge, logKnowledgeGap } from "../lib/knowledge-search.js";

export const chatRouter = Router();

chatRouter.post("/", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
      return res
        .status(400)
        .json({ error: "Message and sessionId are required" });
    }

    if (!message?.trim()) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    if (message.length > 1000) {
      return res
        .status(400)
        .json({ error: "Message too long. Please limit to 1000 characters." });
    }

    // Get or create chat session
    let session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { timestamp: "desc" }, take: 10 } }
    });

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          id: sessionId,
          context: {
            symptoms: [],
            conversationStage: "greeting",
            userInfo: {}
          }
        },
        include: { messages: true }
      });
    }

    // Extract symptoms from user message
    const extractedSymptoms = await extractSymptoms(message);

    // Update session context
    const currentContext = session.context as any;
    const updatedSymptoms = [
      ...new Set([...(currentContext.symptoms || []), ...extractedSymptoms])
    ];

    // Search knowledge base
    const knowledgeResults = await searchKnowledge(message);

    if (knowledgeResults.length === 0) {
      await logKnowledgeGap(message);
    }

    // Build context for LLM
    const knowledgeContext = knowledgeResults
      .map((entry) => `Title: ${entry.title}\nContent: ${entry.content}`)
      .join("\n\n");

    const conversationHistory = session.messages
      .reverse()
      .map((msg) => `${msg.senderType}: ${msg.content}`)
      .join("\n");

    const chatContext = {
      ...currentContext,
      symptoms: updatedSymptoms
    };

    // Generate response
    const botResponse = await generateChatResponse(
      message,
      knowledgeContext,
      conversationHistory,
      chatContext
    );

    // Save user message
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        senderType: "USER",
        content: message,
        intentDetected:
          extractedSymptoms.length > 0 ? "symptom_report" : "general_inquiry"
      }
    });

    // Save bot response
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        senderType: "BOT",
        content: botResponse
      }
    });

    // Update session context
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { context: chatContext }
    });

    // Log knowledge matches
    for (const result of knowledgeResults) {
      await prisma.queryMatch.create({
        data: {
          sessionId: session.id,
          query: message,
          entryId: result.id,
          confidence: 0.8
        }
      });
    }

    res.json({
      response: botResponse,
      sessionId: session.id,
      context: chatContext
    });
  } catch (error) {
    console.error("Chat API error:", error);
    res.status(500).json({
      error: "I'm having trouble processing your request. Please try again."
    });
  }
});

// server/routes/knowledge.ts
import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const knowledgeRouter = Router();

knowledgeRouter.get("/", async (req, res) => {
  try {
    const { category, page = "1", limit = "10" } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where = category ? { category: category as string } : {};

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

knowledgeRouter.post("/", async (req, res) => {
  try {
    const data = req.body;

    const entry = await prisma.knowledgeEntry.create({
      data: {
        ...data,
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

    res.status(201).json(entry);
  } catch (error) {
    console.error("Knowledge POST error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

knowledgeRouter.put("/:id", async (req, res) => {
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
    res.status(500).json({ error: "Failed to update entry" });
  }
});

knowledgeRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.knowledgeEntry.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

// server/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// server/lib/openai.ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateChatResponse(
  userMessage: string,
  knowledgeContext: string,
  conversationHistory: string,
  chatContext: any
): Promise<string> {
  const systemPrompt = `You are a medical assistant chatbot for a telemedicine platform. 

IMPORTANT GUIDELINES:
- Use the provided knowledge base to answer questions
- Always include appropriate medical disclaimers
- Suggest consulting healthcare providers for serious symptoms
- Never provide definitive diagnoses
- Be empathetic and helpful
- If symptoms seem serious, recommend immediate medical attention

KNOWLEDGE BASE:
${knowledgeContext}

CONVERSATION HISTORY:
${conversationHistory}

CURRENT CONTEXT:
User symptoms mentioned: ${chatContext.symptoms?.join(", ") || "None yet"}
Conversation stage: ${chatContext.conversationStage || "greeting"}

Remember to:
1. Respond based on the knowledge base provided
2. Add appropriate medical disclaimers
3. Be conversational and empathetic
4. Suggest escalation if symptoms are concerning`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return (
      completion.choices[0].message.content ||
      "I'm sorry, I couldn't generate a response. Please try again."
    );
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "I'm experiencing technical difficulties. Please try again later or contact support if the issue persists.";
  }
}

export async function extractSymptoms(userMessage: string): Promise<string[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            'Extract medical symptoms from the user\'s message. Return only a JSON array of symptoms, no other text. Example: ["headache", "fever", "nausea"]'
        },
        { role: "user", content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 100
    });

    const response = completion.choices[0].message.content || "[]";
    return JSON.parse(response);
  } catch (error) {
    console.error("Symptom extraction error:", error);
    return [];
  }
}

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
