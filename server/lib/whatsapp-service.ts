// server/lib/whatsapp-service.ts - Fixed version with better error handling
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
  private isInitializing = false;

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
          "--disable-gpu",
          "--disable-extensions",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding"
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
      this.isInitializing = false;
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
      this.isInitializing = false;
      this.addToLog(`Authentication failed: ${msg}`);
    });

    this.client.on("disconnected", (reason) => {
      console.log("📱 WhatsApp disconnected:", reason);
      this.connectionState = "DISCONNECTED";
      this.currentQRCode = null;
      this.activeSessions.clear();
      this.isInitializing = false;
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
    if (this.isInitializing) {
      this.addToLog("Initialization already in progress");
      return;
    }

    try {
      this.isInitializing = true;
      this.connectionState = "CONNECTING";
      this.lastError = null;
      this.addToLog("Initializing WhatsApp service...");

      await this.client.initialize();
      this.addToLog("WhatsApp service initialized");
    } catch (error) {
      console.error("Failed to initialize WhatsApp service:", error);
      this.connectionState = "ERROR";
      this.lastError = error.message;
      this.isInitializing = false;
      this.addToLog(`Initialization failed: ${error.message}`);
      throw error;
    }
  }

  // Phone number validation and formatting
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, "");

    // If it starts with +, keep it
    if (cleaned.startsWith("+")) {
      return cleaned;
    }

    // If it starts with 0, replace with +62 (Indonesia)
    if (cleaned.startsWith("0")) {
      return "+62" + cleaned.substring(1);
    }

    // If it starts with 62, add +
    if (cleaned.startsWith("62")) {
      return "+" + cleaned;
    }

    // If it doesn't have country code, assume Indonesia
    if (cleaned.length >= 10 && !cleaned.startsWith("62")) {
      return "+62" + cleaned;
    }

    return "+" + cleaned;
  }

  private async validatePhoneNumber(phoneNumber: string): Promise<boolean> {
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const numberId = await this.client.getNumberId(formattedNumber);
      return numberId && numberId.exists;
    } catch (error) {
      console.log(
        `Phone number validation failed for ${phoneNumber}:`,
        error.message
      );
      return false;
    }
  }

  private async waitForConnection(maxWaitMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      if (this.connectionState === "READY") {
        return true;
      }
      if (
        this.connectionState === "ERROR" ||
        this.connectionState === "DISCONNECTED"
      ) {
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return false;
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
      // Send immediate acknowledgment/wait message
      await this.sendWaitMessage(phoneNumber, messageText);

      // Get or create session
      let sessionId = this.activeSessions.get(phoneNumber);
      if (!sessionId) {
        sessionId = `wa_${phoneNumber}_${Date.now()}`;
        this.activeSessions.set(phoneNumber, sessionId);
        this.addToLog(`New session created: ${sessionId.substring(0, 20)}...`);
      }

      // Process the message (this takes time)
      const response = await this.processMessage(
        sessionId,
        phoneNumber,
        messageText
      );

      // Send the actual response
      await this.sendMessage(phoneNumber, response);
      this.addToLog(`Response sent to ${phoneNumber.substring(0, 10)}...`);
    } catch (error) {
      console.error("Error handling WhatsApp message:", error);
      this.addToLog(`Error handling message: ${error.message}`);
      try {
        await this.sendMessage(
          phoneNumber,
          "Maaf, saya sedang mengalami gangguan teknis. Silakan coba lagi nanti."
        );
      } catch (sendError) {
        console.error("Failed to send error message:", sendError);
      }
    }
  }

  private async sendWaitMessage(
    phoneNumber: string,
    userMessage: string
  ): Promise<void> {
    try {
      // Determine appropriate wait message based on user input
      const waitMessage = this.getWaitMessage(userMessage);

      // Send the wait message immediately
      await this.sendMessage(phoneNumber, waitMessage);

      // Optional: Send "typing" indicator (if supported)
      await this.sendTypingIndicator(phoneNumber);
    } catch (error) {
      console.error("Failed to send wait message:", error);
      // Don't throw error here, continue with main processing
    }
  }

  private getWaitMessage(userMessage: string): string {
    const lowerMessage = userMessage.toLowerCase();

    // Check for special commands first
    if (lowerMessage.includes("/start") || lowerMessage.includes("/mulai")) {
      return ""; // No wait message for commands
    }

    if (lowerMessage.includes("/help") || lowerMessage.includes("/bantuan")) {
      return ""; // No wait message for help
    }

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
      return "⚠️ *Pesan Darurat Terdeteksi*\n\nSaya sedang memproses informasi Anda dengan prioritas tinggi...\n\n_Jika ini darurat medis, segera hubungi 119 atau ke IGD terdekat._";
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
      return "🏥 Terima kasih telah menghubungi Asisten Medis!\n\nSaya sedang menganalisis gejala yang Anda sampaikan dan mencari informasi medis yang relevan...\n\n_Mohon tunggu sebentar, saya akan segera membalas._";
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
      return "💊 Saya sedang mencari informasi kesehatan terkini untuk menjawab pertanyaan Anda...\n\n_Tunggu sebentar ya, saya akan memberikan informasi yang akurat._";
    }

    // Default wait message for other queries
    return "🤖 Terima kasih atas pesan Anda!\n\nSaya sedang memproses pertanyaan Anda dan menyiapkan respons yang tepat...\n\n_Mohon tunggu sebentar._";
  }

  private async sendTypingIndicator(phoneNumber: string): Promise<void> {
    try {
      // Send typing indicator if the WhatsApp client supports it
      if (this.client && typeof this.client.sendPresenceUpdate === "function") {
        await this.client.sendPresenceUpdate("composing", phoneNumber);

        // Stop typing after a few seconds
        setTimeout(async () => {
          try {
            await this.client.sendPresenceUpdate("paused", phoneNumber);
          } catch (error) {
            // Ignore errors for typing indicator
          }
        }, 5000);
      }
    } catch (error) {
      // Typing indicator is optional, don't fail the main flow
      console.log("Typing indicator not supported or failed:", error.message);
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
      throw new Error(
        `WhatsApp client is not ready. Current state: ${this.connectionState}`
      );
    }

    try {
      // // Format the phone number properly
      // const selfFormattedNumber = this.formatPhoneNumber(phoneNumber);

      // // Validate the number exists on WhatsApp
      // const numberId = await this.client.getNumberId(selfFormattedNumber);
      // if (!numberId || !numberId.exists) {
      //   throw new Error(
      //     `Phone number ${selfFormattedNumber} does not exist on WhatsApp`
      //   );
      // }

      // Send the message
      await this.client.sendMessage(phoneNumber, message);
      // console.log(
      //   `📤 Message sent to ${formattedNumber}: ${message.substring(0, 50)}...`
      // );
    } catch (error) {
      console.error("Failed to send WhatsApp message:", error);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async sendBulkMessage(
    phoneNumbers: string[],
    message: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    if (this.connectionState !== "READY") {
      throw new Error("WhatsApp client is not ready");
    }

    this.addToLog(`Starting bulk message to ${phoneNumbers.length} numbers`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (let i = 0; i < phoneNumbers.length; i++) {
      const phoneNumber = phoneNumbers[i];

      try {
        // Format and validate phone number
        // const formattedNumber = this.formatPhoneNumber(phoneNumber);

        await this.sendMessage(phoneNumber, message);
        results.success++;
        this.addToLog(
          `✅ Message sent to ${phoneNumber.substring(0, 10)}... (${i + 1}/${
            phoneNumbers.length
          })`
        );

        // Add progressive delay to avoid rate limiting
        if (i < phoneNumbers.length - 1) {
          const delay = Math.min(3000 + i * 500, 10000); // Progressive delay, max 10s
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (error) {
        results.failed++;
        const errorMsg = `Failed to send to ${phoneNumber}: ${error.message}`;
        results.errors.push(errorMsg);
        this.addToLog(`❌ ${errorMsg}`);

        // Continue with next number
        continue;
      }
    }

    this.addToLog(
      `Bulk message completed: ${results.success} success, ${results.failed} failed`
    );
    return results;
  }

  async sendTestMessage(phoneNumber: string, message: string): Promise<void> {
    if (this.connectionState !== "READY") {
      throw new Error("WhatsApp client is not ready");
    }

    const testMessage = `🧪 *Test Message from Medical Chatbot*\n\n${message}\n\n_This is a test message to verify the connection._`;
    await this.sendMessage(phoneNumber, testMessage);
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
      error: this.lastError,
      isInitializing: this.isInitializing
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
      this.isInitializing = false;

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
