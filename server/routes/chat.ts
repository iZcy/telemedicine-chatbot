// server/routes/chat.ts - Updated with immediate acknowledgment

import { Router } from "express";
import { prisma } from "../lib/prisma";
import { generateChatResponse, extractSymptoms } from "../lib/openai.js";
import { ragService } from "../lib/rag-service.js";
import { logKnowledgeGap } from "../lib/knowledge-search.js";

export const chatRouter = Router();


chatRouter.post("/", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
      return res
        .status(400)
        .json({ error: "Message dan sessionId diperlukan" });
    }

    if (!message?.trim()) {
      return res.status(400).json({ error: "Pesan tidak boleh kosong" });
    }

    if (message.length > 1000) {
      return res
        .status(400)
        .json({ error: "Pesan terlalu panjang. Maksimal 1000 karakter." });
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
          anonymousId: sessionId, // Use sessionId as anonymousId for tracking web users
          context: {
            symptoms: [],
            conversationStage: "greeting",
            userInfo: {},
            platform: "web"
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

    // Search knowledge base using RAG
    const searchResults = await ragService.searchKnowledge(message);

    if (searchResults.length === 0) {
      await logKnowledgeGap(message);
    }

    // Build knowledge context using RAG
    const knowledgeContext = await ragService.buildKnowledgeContext(
      searchResults
    );

    // Build conversation history
    const conversationHistory = session.messages
      .reverse()
      .map((msg) => `${msg.senderType}: ${msg.content}`)
      .join("\n");

    const chatContext = {
      ...currentContext,
      symptoms: updatedSymptoms,
      platform: "web"
    };

    // Generate response using RAG context
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

    // Log knowledge usage for analytics
    await ragService.logKnowledgeUsage(session.id, message, searchResults);

    // Return the actual response immediately
    res.json({
      response: botResponse,
      sessionId: sessionId,
      context: chatContext,
      knowledgeUsed: searchResults.length > 0,
      relevantSources: searchResults.map((result) => ({
        title: result.entry.title,
        category: result.entry.category,
        relevanceScore: result.relevanceScore,
        matchType: result.matchType
      }))
    });
  } catch (error) {
    console.error("Chat API error:", error);
    res.status(500).json({
      error:
        "Saya mengalami masalah dalam memproses permintaan Anda. Silakan coba lagi."
    });
  }
});

// Add new endpoint for getting the actual response
chatRouter.post("/get-response", async (req, res) => {
  try {
    const { sessionId, messageId } = req.body;

    if (!sessionId || !messageId) {
      return res
        .status(400)
        .json({ error: "sessionId dan messageId diperlukan" });
    }

    // Check if response is ready (implementation depends on your architecture)
    const response = await getProcessedResponse(sessionId, messageId);

    if (response) {
      res.json(response);
    } else {
      res.status(202).json({
        message: "Masih memproses...",
        ready: false
      });
    }
  } catch (error) {
    console.error("Get response error:", error);
    res.status(500).json({ error: "Gagal mengambil respons" });
  }
});

// Helper function to get processed response
async function getProcessedResponse(
  sessionId: string,
  _messageId: string
): Promise<any> {
  try {
    // Get the latest bot message for this session
    const latestMessage = await prisma.chatMessage.findFirst({
      where: {
        sessionId: sessionId,
        senderType: "BOT"
      },
      orderBy: { timestamp: "desc" }
    });

    if (latestMessage) {
      // Get session context
      const session = await prisma.chatSession.findUnique({
        where: { id: sessionId }
      });

      return {
        response: latestMessage.content,
        sessionId: sessionId,
        isWaitMessage: false,
        context: session?.context || {},
        knowledgeUsed: true,
        relevantSources: [],
        messageId: latestMessage.id,
        timestamp: latestMessage.timestamp
      };
    }

    return null;
  } catch (error) {
    console.error("Error getting processed response:", error);
    return null;
  }
}

