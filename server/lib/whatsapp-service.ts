// server/lib/whatsapp-service.ts - Enhanced version
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
import { prisma } from "./prisma";
import { ragService } from "./rag-service";
import { generateChatResponse, extractSymptoms } from "./openai";
import { logKnowledgeGap } from "./knowledge-search";

type ConnectionState =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "READY"
  | "ERROR";

export class WhatsAppService {
  private client: any;
  private connectionState: ConnectionState = "DISCONNECTED";
  private activeSessions = new Map<string, string>(); // phone -> sessionId
  private currentQRCode: string | null = null;
  private lastConnectedTime: string | null = null;
  private lastError: string | null = null;
  private connectionLogs: string[] = [];

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: "medical-chatbot"
      }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu"
        ]
      }
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.client.on("qr", (qr) => {
      console.log("📱 QR Code received, please scan with WhatsApp:");

      // Display QR in terminal for debugging
      qrcode.generate(qr, { small: true });

      // Convert QR to base64 for web display
      this.generateQRCode(qr);
      this.addToLog("QR Code generated - Please scan with your WhatsApp");
      this.connectionState = "CONNECTING";
    });

    this.client.on("ready", () => {
      console.log("✅ WhatsApp client is ready!");
      this.connectionState = "READY";
      this.currentQRCode = null;
      this.lastConnectedTime = new Date().toISOString();
      this.lastError = null;
      this.addToLog("WhatsApp connected and ready");
    });

    this.client.on("authenticated", () => {
      console.log("🔐 WhatsApp authenticated");
      this.connectionState = "CONNECTED";
      this.addToLog("Authentication successful");
    });

    this.client.on("auth_failure", (msg) => {
      console.error("❌ WhatsApp authentication failed:", msg);
      this.connectionState = "ERROR";
      this.lastError = `Authentication failed: ${msg}`;
      this.addToLog(`Authentication failed: ${msg}`);
    });

    this.client.on("disconnected", (reason) => {
      console.log("📱 WhatsApp disconnected:", reason);
      this.connectionState = "DISCONNECTED";
      this.currentQRCode = null;
      this.activeSessions.clear();
      this.addToLog(`Disconnected: ${reason}`);
    });

    this.client.on("loading_screen", (percent, message) => {
      console.log(`⏳ Loading: ${percent}% - ${message}`);
      this.addToLog(`Loading: ${percent}% - ${message}`);
    });

    this.client.on("message", this.handleMessage.bind(this));
  }

  private async generateQRCode(qrString: string) {
    try {
      // Convert QR string to base64 image using qrcode library
      const QRCode = await import("qrcode");
      const qrBuffer = await QRCode.toBuffer(qrString, {
        type: "png",
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF"
        }
      });
      this.currentQRCode = qrBuffer.toString("base64");
    } catch (error) {
      console.error("Error generating QR code:", error);
      this.currentQRCode = null;
    }
  }

  private addToLog(message: string) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.connectionLogs.unshift(logEntry);

    // Keep only last 50 logs
    if (this.connectionLogs.length > 50) {
      this.connectionLogs = this.connectionLogs.slice(0, 50);
    }

    console.log(`📱 WhatsApp: ${message}`);
  }

  async initialize() {
    try {
      this.connectionState = "CONNECTING";
      this.lastError = null;
      this.addToLog("Initializing WhatsApp service...");

      await this.client.initialize();
      this.addToLog("WhatsApp service initialized");
    } catch (error) {
      console.error("Failed to initialize WhatsApp service:", error);
      this.connectionState = "ERROR";
      this.lastError = error.message;
      this.addToLog(`Initialization failed: ${error.message}`);
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

    console.log(`📨 WhatsApp message from ${phoneNumber}: ${messageText}`);
    this.addToLog(`Message received from ${phoneNumber.substring(0, 10)}...`);

    try {
      // Get or create session
      let sessionId = this.activeSessions.get(phoneNumber);
      if (!sessionId) {
        sessionId = `wa_${phoneNumber}_${Date.now()}`;
        this.activeSessions.set(phoneNumber, sessionId);
        this.addToLog(`New session created: ${sessionId.substring(0, 20)}...`);
      }

      // Process the message
      const response = await this.processMessage(
        sessionId,
        phoneNumber,
        messageText
      );

      // Send response
      await this.sendMessage(phoneNumber, response);
      this.addToLog(`Response sent to ${phoneNumber.substring(0, 10)}...`);
    } catch (error) {
      console.error("Error handling WhatsApp message:", error);
      this.addToLog(`Error handling message: ${error.message}`);
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
    if (this.connectionState !== "READY") {
      console.error("WhatsApp client is not ready");
      throw new Error("WhatsApp client is not ready");
    }

    try {
      await this.client.sendMessage(phoneNumber, message);
      console.log(
        `📤 Message sent to ${phoneNumber}: ${message.substring(0, 50)}...`
      );
    } catch (error) {
      console.error("Failed to send WhatsApp message:", error);
      throw error;
    }
  }

  async sendBulkMessage(
    phoneNumbers: string[],
    message: string
  ): Promise<void> {
    if (this.connectionState !== "READY") {
      throw new Error("WhatsApp client is not ready");
    }

    this.addToLog(`Starting bulk message to ${phoneNumbers.length} numbers`);

    for (const phoneNumber of phoneNumbers) {
      try {
        await this.sendMessage(phoneNumber, message);
        this.addToLog(`Message sent to ${phoneNumber.substring(0, 10)}...`);
        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to send message to ${phoneNumber}:`, error);
        this.addToLog(
          `Failed to send to ${phoneNumber.substring(0, 10)}...: ${
            error.message
          }`
        );
      }
    }

    this.addToLog(`Bulk message completed`);
  }

  async sendTestMessage(phoneNumber: string, message: string): Promise<void> {
    if (this.connectionState !== "READY") {
      throw new Error("WhatsApp client is not ready");
    }

    await this.sendMessage(phoneNumber, `🧪 Test Message: ${message}`);
    this.addToLog(`Test message sent to ${phoneNumber.substring(0, 10)}...`);
  }

  // Status methods
  getStatus(): { isReady: boolean; activeSessions: number } {
    return {
      isReady: this.connectionState === "READY",
      activeSessions: this.activeSessions.size
    };
  }

  getDetailedStatus() {
    return {
      connectionState: this.connectionState,
      activeSessions: this.activeSessions.size,
      lastConnected: this.lastConnectedTime,
      error: this.lastError
    };
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getCurrentQRCode(): string | null {
    return this.currentQRCode;
  }

  getLastConnectedTime(): string | null {
    return this.lastConnectedTime;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  getConnectionLogs(): string[] {
    return this.connectionLogs;
  }

  isReady(): boolean {
    return this.connectionState === "READY";
  }

  async disconnect(): Promise<void> {
    try {
      this.addToLog("Disconnecting WhatsApp service...");

      if (this.client) {
        await this.client.destroy();
      }

      this.connectionState = "DISCONNECTED";
      this.currentQRCode = null;
      this.activeSessions.clear();
      this.lastError = null;

      this.addToLog("WhatsApp service disconnected successfully");

      // Reinitialize client for next connection
      this.initializeClient();
    } catch (error) {
      console.error("Error during disconnect:", error);
      this.addToLog(`Disconnect error: ${error.message}`);
      throw error;
    }
  }
}

export const whatsappService = new WhatsAppService();
