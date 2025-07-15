// server/routes/chat.ts
import { Router } from "express";
import { prisma } from "../lib/prisma";
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
