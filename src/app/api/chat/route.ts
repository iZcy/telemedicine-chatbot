import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateChatResponse, extractSymptoms } from "@/lib/openai";
import { searchKnowledge, logKnowledgeGap } from "@/lib/knowledge-search";

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json();

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: "Message and sessionId are required" },
        { status: 400 }
      );
    }

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      );
    }

    if (message.length > 1000) {
      return NextResponse.json(
        { error: "Message too long. Please limit to 1000 characters." },
        { status: 400 }
      );
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
      data: {
        context: chatContext
      }
    });

    // Log knowledge matches
    for (const result of knowledgeResults) {
      await prisma.queryMatch.create({
        data: {
          sessionId: session.id,
          query: message,
          entryId: result.id,
          confidence: 0.8 // You can implement proper scoring later
        }
      });
    }

    return NextResponse.json({
      response: botResponse,
      sessionId: session.id,
      context: chatContext
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        error: "I'm having trouble processing your request. Please try again."
      },
      { status: 500 }
    );
  }
}
