// server/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { chatRouter } from "./routes/chat";
import { knowledgeRouter } from "./routes/knowledge";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { statsRouter } from "./routes/stats";
import { whatsappRouter } from "./routes/whatsapp";
import { whatsappService } from "./lib/whatsapp-service";

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
  message: "Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti.",
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/chat", chatRouter);
app.use("/api/knowledge", knowledgeRouter);
app.use("/api/stats", statsRouter);
app.use("/api/whatsapp", whatsappRouter);
app.use("/health", healthRouter);

// Legacy health check (for backward compatibility)
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Chatbot Medis Telemedicine API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      auth: "/api/auth",
      chat: "/api/chat",
      knowledge: "/api/knowledge",
      stats: "/api/stats",
      whatsapp: "/api/whatsapp",
      health: "/health",
      ai_health: "/health/ai",
      status: "/health/status"
    }
  });
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

    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === "development";

    res.status(err.status || 500).json({
      error: isDevelopment ? err.message : "Terjadi kesalahan server internal",
      timestamp: new Date().toISOString(),
      ...(isDevelopment && { stack: err.stack })
    });
  }
);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint tidak ditemukan",
    timestamp: new Date().toISOString(),
    available_endpoints: {
      auth: "/api/auth",
      chat: "/api/chat",
      knowledge: "/api/knowledge",
      stats: "/api/stats",
      whatsapp: "/api/whatsapp",
      health: "/health",
      ai_health: "/health/ai",
      status: "/health/status"
    }
  });
});

// Initialize WhatsApp service if enabled
async function initializeServices() {
  if (process.env.ENABLE_WHATSAPP === "true") {
    try {
      console.log("🟢 Initializing WhatsApp service...");
      await whatsappService.initialize();
      console.log("✅ WhatsApp service initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize WhatsApp service:", error);
      console.log("📱 WhatsApp service will be disabled");
    }
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔐 JWT Secret configured: ${!!process.env.JWT_SECRET}`);
  console.log(`🤖 DeepSeek configured: ${!!process.env.DEEPSEEK_API_KEY}`);
  console.log(`📊 Health check tersedia di: http://localhost:${PORT}/health`);
  console.log(
    `📱 WhatsApp service: ${
      process.env.ENABLE_WHATSAPP === "true" ? "Enabled" : "Disabled"
    }`
  );

  // Initialize services after server starts
  await initializeServices();
});
