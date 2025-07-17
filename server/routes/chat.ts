// server/routes/chat.ts - Updated with immediate acknowledgment

import { Router } from "express";
import { prisma } from "../lib/prisma";
import { generateChatResponse, extractSymptoms } from "../lib/openai.js";
import { ragService } from "../lib/rag-service.js";
import { logKnowledgeGap } from "../lib/knowledge-search.js";

export const chatRouter = Router();

// Helper function to generate wait message
function getWaitMessage(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();

  // Check for emergency keywords
  const emergencyKeywords = [
    "darurat",
    "emergency",
    "sesak napas",
    "nyeri dada",
    "pingsan",
    "tidak sadar",
    "kecelakaan",
    "pendarahan",
    "demam tinggi"
  ];

  if (emergencyKeywords.some((keyword) => lowerMessage.includes(keyword))) {
    return "⚠️ Saya mendeteksi ini mungkin situasi darurat. Sedang memproses dengan prioritas tinggi... Jika ini darurat medis, segera hubungi 119!";
  }

  // Check for symptom-related messages
  const symptomKeywords = [
    "sakit",
    "nyeri",
    "demam",
    "pusing",
    "mual",
    "batuk",
    "pilek",
    "diare",
    "muntah",
    "gatal",
    "bengkak",
    "lemas",
    "sesak"
  ];

  if (symptomKeywords.some((keyword) => lowerMessage.includes(keyword))) {
    return "Terima kasih telah menjelaskan gejala Anda. Saya sedang menganalisis informasi medis yang relevan untuk memberikan panduan yang tepat...";
  }

  // Check for general health questions
  const healthKeywords = [
    "obat",
    "vitamin",
    "makanan",
    "olahraga",
    "diet",
    "tidur",
    "stress",
    "hamil",
    "anak",
    "lansia",
    "kesehatan"
  ];

  if (healthKeywords.some((keyword) => lowerMessage.includes(keyword))) {
    return "Saya sedang mencari informasi kesehatan terkini untuk menjawab pertanyaan Anda. Mohon tunggu sebentar...";
  }

  // Default wait message
  return "Terima kasih atas pertanyaan Anda. Saya sedang memproses informasi dan menyiapkan respons yang akurat...";
}

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

    // Send immediate acknowledgment response
    const waitMessage = getWaitMessage(message);

    // Return wait message immediately
    res.json({
      response: waitMessage,
      sessionId: sessionId,
      isWaitMessage: true,
      context: { processing: true },
      knowledgeUsed: false,
      relevantSources: []
    });

    // Process the actual message asynchronously
    processMessageAsync(message, sessionId).catch((error) => {
      console.error("Async message processing failed:", error);
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

// Async processing function
async function processMessageAsync(
  message: string,
  sessionId: string
): Promise<void> {
  try {
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
    const savedBotMessage = await prisma.chatMessage.create({
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

    // Here you could implement WebSocket or Server-Sent Events to push the response
    // Or store the response in a way that the frontend can poll for it
    console.log(
      `✅ Processed message for session ${sessionId}: ${botResponse.substring(
        0,
        100
      )}...`
    );
  } catch (error) {
    console.error("Async processing error:", error);

    // Save error message to session
    try {
      await prisma.chatMessage.create({
        data: {
          sessionId: sessionId,
          senderType: "BOT",
          content:
            "Maaf, saya mengalami kesalahan dalam memproses pesan Anda. Silakan coba lagi."
        }
      });
    } catch (saveError) {
      console.error("Failed to save error message:", saveError);
    }
  }
}

// Helper function to get processed response (you'll need to implement this)
async function getProcessedResponse(
  sessionId: string,
  messageId: string
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
        relevantSources: [], // You can get this from the knowledge usage logs
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
