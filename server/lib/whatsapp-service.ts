// server/lib/whatsapp-service.ts
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import { prisma } from "./prisma";
import { ragService } from "./rag-service";
import { generateChatResponse, extractSymptoms } from "./openai";
import { logKnowledgeGap } from "./knowledge-search";

export class WhatsAppService {
  private client: any;
  private isReady = false;
  private activeSessions = new Map<string, string>(); // phone -> sessionId

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: "medical-chatbot"
      }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      }
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.client.on("qr", (qr) => {
      console.log("QR Code received, please scan with WhatsApp:");
      console.log(qr);
    });

    this.client.on("ready", () => {
      console.log("WhatsApp client is ready!");
      this.isReady = true;
    });

    this.client.on("message", this.handleMessage.bind(this));

    this.client.on("authenticated", () => {
      console.log("WhatsApp authenticated");
    });

    this.client.on("auth_failure", (msg) => {
      console.error("WhatsApp authentication failed:", msg);
    });

    this.client.on("disconnected", (reason) => {
      console.log("WhatsApp disconnected:", reason);
      this.isReady = false;
    });
  }

  async initialize() {
    try {
      await this.client.initialize();
      console.log("WhatsApp service initialized");
    } catch (error) {
      console.error("Failed to initialize WhatsApp service:", error);
      throw error;
    }
  }

  private async handleMessage(message: any) {
    // Ignore messages from status and groups
    if (message.from === "status@broadcast" || message.from.includes("@g.us")) {
      return;
    }

    // Ignore messages from bot itself
    if (message.fromMe) {
      return;
    }

    const phoneNumber = message.from;
    const messageText = message.body;

    console.log(`WhatsApp message from ${phoneNumber}: ${messageText}`);

    try {
      // Get or create session
      let sessionId = this.activeSessions.get(phoneNumber);
      if (!sessionId) {
        sessionId = `wa_${phoneNumber}_${Date.now()}`;
        this.activeSessions.set(phoneNumber, sessionId);
      }

      // Process the message
      const response = await this.processMessage(
        sessionId,
        phoneNumber,
        messageText
      );

      // Send response
      await this.sendMessage(phoneNumber, response);
    } catch (error) {
      console.error("Error handling WhatsApp message:", error);
      await this.sendMessage(
        phoneNumber,
        "Maaf, saya sedang mengalami gangguan teknis. Silakan coba lagi nanti."
      );
    }
  }

  private async processMessage(
    sessionId: string,
    phoneNumber: string,
    messageText: string
  ): Promise<string> {
    // Handle special commands
    if (
      messageText.toLowerCase().trim() === "/start" ||
      messageText.toLowerCase().trim() === "/mulai"
    ) {
      return this.getWelcomeMessage();
    }

    if (
      messageText.toLowerCase().trim() === "/help" ||
      messageText.toLowerCase().trim() === "/bantuan"
    ) {
      return this.getHelpMessage();
    }

    if (
      messageText.toLowerCase().trim() === "/stop" ||
      messageText.toLowerCase().trim() === "/berhenti"
    ) {
      this.activeSessions.delete(phoneNumber);
      return "Sesi chat telah berakhir. Terima kasih telah menggunakan layanan kami. Ketik /start untuk memulai sesi baru.";
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
            userInfo: { phone: phoneNumber },
            platform: "whatsapp"
          }
        },
        include: { messages: true }
      });
    }

    // Extract symptoms from user message
    const extractedSymptoms = await extractSymptoms(messageText);

    // Update session context
    const currentContext = session.context as any;
    const updatedSymptoms = [
      ...new Set([...(currentContext.symptoms || []), ...extractedSymptoms])
    ];

    // Search knowledge base using RAG
    const searchResults = await ragService.searchKnowledge(messageText);

    if (searchResults.length === 0) {
      await logKnowledgeGap(messageText);
    }

    // Build knowledge context
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
      platform: "whatsapp"
    };

    // Generate response
    const botResponse = await generateChatResponse(
      messageText,
      knowledgeContext,
      conversationHistory,
      chatContext
    );

    // Save user message
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        senderType: "USER",
        content: messageText,
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

    // Log knowledge usage
    await ragService.logKnowledgeUsage(session.id, messageText, searchResults);

    return botResponse;
  }

  private getWelcomeMessage(): string {
    return `🏥 *Selamat datang di Asisten Medis WhatsApp*

Saya adalah chatbot medis yang siap membantu Anda dengan:
• Informasi kesehatan umum
• Penjelasan gejala
• Saran perawatan dasar
• Panduan kapan harus ke dokter

⚠️ *Penting:* Saya hanya memberikan informasi umum dan bukan pengganti konsultasi medis profesional.

Silakan ceritakan keluhan atau pertanyaan kesehatan Anda.

Ketik /bantuan untuk melihat perintah yang tersedia.`;
  }

  private getHelpMessage(): string {
    return `📋 *Perintah yang tersedia:*

/start atau /mulai - Mulai sesi baru
/bantuan atau /help - Tampilkan pesan ini
/stop atau /berhenti - Akhiri sesi chat

🔹 *Cara menggunakan:*
- Kirim pesan tentang gejala atau keluhan Anda
- Saya akan memberikan informasi dan saran
- Untuk keluhan serius, saya akan sarankan konsultasi dokter

⚠️ *Dalam keadaan darurat, segera hubungi 119 atau ke rumah sakit terdekat.*`;
  }

  private async sendMessage(
    phoneNumber: string,
    message: string
  ): Promise<void> {
    if (!this.isReady) {
      console.error("WhatsApp client is not ready");
      return;
    }

    try {
      await this.client.sendMessage(phoneNumber, message);
      console.log(
        `Message sent to ${phoneNumber}: ${message.substring(0, 50)}...`
      );
    } catch (error) {
      console.error("Failed to send WhatsApp message:", error);
    }
  }

  async sendBulkMessage(
    phoneNumbers: string[],
    message: string
  ): Promise<void> {
    if (!this.isReady) {
      console.error("WhatsApp client is not ready");
      return;
    }

    for (const phoneNumber of phoneNumbers) {
      try {
        await this.sendMessage(phoneNumber, message);
        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to send message to ${phoneNumber}:`, error);
      }
    }
  }

  getStatus(): { isReady: boolean; activeSessions: number } {
    return {
      isReady: this.isReady,
      activeSessions: this.activeSessions.size
    };
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.isReady = false;
      this.activeSessions.clear();
    }
  }
}

export const whatsappService = new WhatsAppService();
