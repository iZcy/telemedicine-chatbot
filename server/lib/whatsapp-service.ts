// server/lib/whatsapp-service.ts - Complete enhanced version
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
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

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
          "--disable-renderer-backgrounding",
          "--disable-features=VizDisplayCompositor",
          "--disable-ipc-flooding-protection"
        ],
        timeout: 60000 // Increase timeout
      },
      // Add session save frequency to prevent session corruption
      takeoverOnConflict: false,
      takeoverTimeoutMs: 0
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.client.on("qr", (qr: string) => {
      console.log("📱 QR Code received, please scan with WhatsApp:");
      qrcode.generate(qr, { small: true });
      this.generateQRCode(qr);
      this.addToLog("QR Code generated - Please scan with your WhatsApp");
      this.connectionState = "CONNECTING";
      this.reconnectAttempts = 0; // Reset attempts on new QR
    });

    this.client.on("ready", () => {
      console.log("✅ WhatsApp client is ready!");
      this.connectionState = "READY";
      this.currentQRCode = null;
      this.lastConnectedTime = new Date().toISOString();
      this.lastError = null;
      this.isInitializing = false;
      this.reconnectAttempts = 0;
      this.addToLog("WhatsApp connected and ready");
    });

    this.client.on("authenticated", () => {
      console.log("🔐 WhatsApp authenticated");
      this.connectionState = "CONNECTED";
      this.addToLog("Authentication successful");
    });

    this.client.on("auth_failure", (msg: string) => {
      console.error("❌ WhatsApp authentication failed:", msg);
      this.connectionState = "ERROR";
      this.lastError = `Authentication failed: ${msg}`;
      this.isInitializing = false;
      this.addToLog(`Authentication failed: ${msg}`);
      this.clearAllSessions();
    });

    this.client.on("disconnected", (reason: string) => {
      console.log("📱 WhatsApp disconnected:", reason);
      this.connectionState = "DISCONNECTED";
      this.currentQRCode = null;
      this.isInitializing = false;
      this.addToLog(`Disconnected: ${reason}`);
      this.clearAllSessions();

      // Auto-reconnect logic for unexpected disconnections
      if (
        reason !== "LOGOUT" &&
        this.reconnectAttempts < this.maxReconnectAttempts
      ) {
        this.attemptReconnect();
      }
    });

    this.client.on("loading_screen", (percent: number, message: string) => {
      console.log(`⏳ Loading: ${percent}% - ${message}`);
      this.addToLog(`Loading: ${percent}% - ${message}`);
    });

    // Add error event handler
    this.client.on("error", (error: any) => {
      console.error("❌ WhatsApp client error:", error);
      this.addToLog(`Client error: ${error.message || error}`);

      // Handle specific error types
      if (error.message && error.message.includes("Evaluation failed")) {
        this.addToLog(
          "Puppeteer evaluation error detected - attempting recovery"
        );
        this.handleEvaluationError();
      }
    });

    this.client.on("message", this.handleMessage.bind(this));
  }

  // 🔄 Auto-reconnect logic
  private async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.addToLog("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(5000 * this.reconnectAttempts, 30000); // Exponential backoff, max 30s

    this.addToLog(
      `Attempting reconnection ${this.reconnectAttempts}/${
        this.maxReconnectAttempts
      } in ${delay / 1000}s...`
    );

    setTimeout(async () => {
      try {
        if (this.connectionState === "DISCONNECTED") {
          await this.initialize();
        }
      } catch (error) {
        this.addToLog(`Reconnection attempt ${this.reconnectAttempts} failed`);
      }
    }, delay);
  }

  // 🛠️ Handle evaluation errors
  private async handleEvaluationError() {
    try {
      this.addToLog("Attempting to recover from evaluation error...");

      // Try to restart the client
      if (this.client) {
        await this.client.destroy();
      }

      // Wait a bit before reinitializing
      setTimeout(() => {
        this.initializeClient();
      }, 3000);
    } catch (error) {
      this.addToLog("Recovery attempt failed");
    }
  }

  // 🧹 Clear all stored sessions
  private clearAllSessions() {
    const sessionCount = this.activeSessions.size;

    if (sessionCount > 0) {
      console.log(`🧹 Clearing ${sessionCount} active WhatsApp sessions...`);
      this.addToLog(`Clearing ${sessionCount} active sessions`);

      this.activeSessions.clear();

      this.endDatabaseSessions().catch((error) => {
        console.error("Error ending database sessions:", error);
        this.addToLog("Error clearing database sessions");
      });

      this.addToLog("All sessions cleared successfully");
    }
  }

  // 🧹 Clear WhatsApp authentication data
  private async clearWhatsAppAuth(): Promise<void> {
    try {
      const fs = await import("fs");
      const path = await import("path");

      const sessionPath = path.join(process.cwd(), ".wwebjs_auth");
      const cachePath = path.join(process.cwd(), ".wwebjs_cache");

      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        this.addToLog("WhatsApp authentication data cleared");
        console.log("🧹 WhatsApp authentication data removed");
      }

      if (fs.existsSync(cachePath)) {
        fs.rmSync(cachePath, { recursive: true, force: true });
        this.addToLog("WhatsApp cache data cleared");
        console.log("🧹 WhatsApp cache data removed");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error clearing WhatsApp auth data:", error);
      this.addToLog(`Error clearing auth data: ${errorMessage}`);
    }
  }

  // 🧹 End all WhatsApp sessions in database
  private async endDatabaseSessions(): Promise<void> {
    try {
      const activeSessions = await prisma.chatSession.findMany({
        where: {
          status: "ACTIVE",
          context: {
            path: ["platform"],
            equals: "whatsapp"
          }
        }
      });

      if (activeSessions.length > 0) {
        await prisma.chatSession.updateMany({
          where: {
            status: "ACTIVE",
            context: {
              path: ["platform"],
              equals: "whatsapp"
            }
          },
          data: {
            status: "ENDED",
            endedAt: new Date()
          }
        });

        console.log(
          `📝 Ended ${activeSessions.length} WhatsApp sessions in database`
        );
        this.addToLog(`Ended ${activeSessions.length} database sessions`);
      }
    } catch (error) {
      console.error("Failed to end database sessions:", error);
      throw error;
    }
  }

  private async generateQRCode(qrString: string) {
    try {
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
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to initialize WhatsApp service:", error);
      this.connectionState = "ERROR";
      this.lastError = errorMessage;
      this.isInitializing = false;
      this.addToLog(`Initialization failed: ${errorMessage}`);
      this.clearAllSessions();
      throw error;
    }
  }

  private async handleMessage(message: any) {
    if (message.from === "status@broadcast" || message.from.includes("@g.us")) {
      return;
    }

    if (message.fromMe) {
      return;
    }

    const phoneNumber = message.from;
    const messageText = message.body;

    console.log(`📨 WhatsApp message from ${phoneNumber}: ${messageText}`);
    this.addToLog(`Message received from ${phoneNumber.substring(0, 10)}...`);

    try {
      await this.sendWaitMessage(phoneNumber, messageText);

      let sessionId = this.activeSessions.get(phoneNumber);
      if (!sessionId) {
        sessionId = `wa_${phoneNumber}_${Date.now()}`;
        this.activeSessions.set(phoneNumber, sessionId);
        this.addToLog(`New session created: ${sessionId.substring(0, 20)}...`);
      }

      const response = await this.processMessage(
        sessionId,
        phoneNumber,
        messageText
      );

      await this.sendMessage(phoneNumber, response);
      this.addToLog(`Response sent to ${phoneNumber.substring(0, 10)}...`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error handling WhatsApp message:", error);
      this.addToLog(`Error handling message: ${errorMessage}`);
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
      const waitMessage = this.getWaitMessage(userMessage);
      await this.sendMessage(phoneNumber, waitMessage);
      await this.sendTypingIndicator(phoneNumber);
    } catch (error) {
      console.error("Failed to send wait message:", error);
    }
  }

  private getWaitMessage(userMessage: string): string {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes("/start") || lowerMessage.includes("/mulai")) {
      return "";
    }

    if (lowerMessage.includes("/help") || lowerMessage.includes("/bantuan")) {
      return "";
    }

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

    return "🤖 Terima kasih atas pesan Anda!\n\nSaya sedang memproses pertanyaan Anda dan menyiapkan respons yang tepat...\n\n_Mohon tunggu sebentar._";
  }

  private async sendTypingIndicator(phoneNumber: string): Promise<void> {
    try {
      if (this.client && typeof this.client.sendPresenceUpdate === "function") {
        await this.client.sendPresenceUpdate("composing", phoneNumber);

        setTimeout(async () => {
          try {
            await this.client.sendPresenceUpdate("paused", phoneNumber);
          } catch (error) {
            // Ignore errors for typing indicator
          }
        }, 5000);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.log("Typing indicator not supported or failed:", errorMessage);
    }
  }

  private async processMessage(
    sessionId: string,
    phoneNumber: string,
    messageText: string
  ): Promise<string> {
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

    const extractedSymptoms = await extractSymptoms(messageText);

    const currentContext = session.context as any;
    const updatedSymptoms = [
      ...new Set([...(currentContext.symptoms || []), ...extractedSymptoms])
    ];

    const searchResults = await ragService.searchKnowledge(messageText);

    if (searchResults.length === 0) {
      await logKnowledgeGap(messageText);
    }

    const knowledgeContext = await ragService.buildKnowledgeContext(
      searchResults
    );

    const conversationHistory = session.messages
      .reverse()
      .map((msg) => `${msg.senderType}: ${msg.content}`)
      .join("\n");

    const chatContext = {
      ...currentContext,
      symptoms: updatedSymptoms,
      platform: "whatsapp"
    };

    const botResponse = await generateChatResponse(
      messageText,
      knowledgeContext,
      conversationHistory,
      chatContext
    );

    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        senderType: "USER",
        content: messageText,
        intentDetected:
          extractedSymptoms.length > 0 ? "symptom_report" : "general_inquiry"
      }
    });

    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        senderType: "BOT",
        content: botResponse
      }
    });

    await prisma.chatSession.update({
      where: { id: session.id },
      data: { context: chatContext }
    });

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

  // 🛡️ Enhanced sendMessage with retry logic
  private async sendMessage(
    phoneNumber: string,
    message: string,
    retryCount: number = 0
  ): Promise<void> {
    if (this.connectionState !== "READY") {
      throw new Error(
        `WhatsApp client is not ready. Current state: ${this.connectionState}`
      );
    }

    try {
      if (retryCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * retryCount));
      }

      await this.client.sendMessage(phoneNumber, message);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes("Evaluation failed") && retryCount < 2) {
        this.addToLog(
          `Evaluation error, retrying... (attempt ${retryCount + 1})`
        );
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return this.sendMessage(phoneNumber, message, retryCount + 1);
      }

      if (
        errorMessage.includes("Session closed") ||
        errorMessage.includes("Protocol error")
      ) {
        this.addToLog("Session error detected, triggering reconnection");
        this.connectionState = "ERROR";
        this.handleEvaluationError();
      }

      console.error("Failed to send WhatsApp message:", error);
      throw new Error(`Failed to send message: ${errorMessage}`);
    }
  }

  // 🛡️ Enhanced bulk message with better error handling
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

      if (this.connectionState !== "READY") {
        const errorMsg = `Connection lost during bulk send at ${i}/${phoneNumbers.length}`;
        results.errors.push(errorMsg);
        this.addToLog(errorMsg);
        break;
      }

      try {
        await this.sendMessage(phoneNumber, message);
        results.success++;
        this.addToLog(
          `✅ Message sent to ${phoneNumber.substring(0, 10)}... (${i + 1}/${
            phoneNumbers.length
          })`
        );

        if (i < phoneNumbers.length - 1) {
          const delay = Math.min(5000 + i * 1000, 15000); // Progressive delay, max 15s
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (error) {
        results.failed++;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        const errorMsg = `Failed to send to ${phoneNumber}: ${errorMessage}`;
        results.errors.push(errorMsg);
        this.addToLog(`❌ ${errorMsg}`);

        if (errorMessage.includes("Evaluation failed")) {
          this.addToLog(
            "Evaluation error in bulk send, waiting 10s before continuing..."
          );
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }

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
      isInitializing: this.isInitializing,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
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

  // 🧹 PUBLIC METHOD: Manually clear sessions
  public async clearSessions(): Promise<{ cleared: number }> {
    const sessionCount = this.activeSessions.size;
    this.clearAllSessions();
    return { cleared: sessionCount };
  }

  // 🧹 PUBLIC METHOD: Get session information
  public getSessionInfo(): {
    activeCount: number;
    sessions: Array<{ phone: string; sessionId: string; duration: string }>;
  } {
    const sessions = Array.from(this.activeSessions.entries()).map(
      ([phone, sessionId]) => ({
        phone: phone.substring(0, 10) + "...",
        sessionId: sessionId.substring(0, 20) + "...",
        duration: "Active"
      })
    );

    return {
      activeCount: this.activeSessions.size,
      sessions
    };
  }

  async disconnect(): Promise<void> {
    try {
      this.addToLog("Disconnecting WhatsApp service...");

      this.clearAllSessions();

      if (this.client) {
        await this.client.destroy();
      }

      await this.clearWhatsAppAuth();

      this.connectionState = "DISCONNECTED";
      this.currentQRCode = null;
      this.lastError = null;
      this.isInitializing = false;

      this.addToLog("WhatsApp service disconnected successfully");

      this.initializeClient();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error during disconnect:", error);
      this.addToLog(`Disconnect error: ${errorMessage}`);

      this.clearAllSessions();
      await this.clearWhatsAppAuth();
      throw error;
    }
  }

  // 🧹 PUBLIC METHOD: Force logout (clear auth + disconnect)
  public async forceLogout(): Promise<{
    cleared: number;
    authCleared: boolean;
  }> {
    try {
      const sessionCount = this.activeSessions.size;
      await this.disconnect();

      return {
        cleared: sessionCount,
        authCleared: true
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.addToLog(`Force logout error: ${errorMessage}`);
      return {
        cleared: 0,
        authCleared: false
      };
    }
  }
}

export const whatsappService = new WhatsAppService();
