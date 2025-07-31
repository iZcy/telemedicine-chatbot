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
import { knowledgeGapsRouter } from "./routes/knowledge-gaps";
import { whatsappService } from "./lib/whatsapp-service";
import { gapEvaluationService } from "./lib/gap-evaluation-service";
import { disconnectPrisma } from "./lib/prisma";

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
app.use("/api/knowledge-gaps", knowledgeGapsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/whatsapp", whatsappRouter);
app.use("/health", healthRouter);

// Legacy health check (for backward compatibility)
app.get("/health", (_req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Root endpoint
app.get("/", (_req, res) => {
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
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
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
app.use("*", (_req, res) => {
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

// Initialize services
async function initializeServices() {
  // Initialize WhatsApp service if enabled
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

  // Initialize gap evaluation service
  try {
    console.log("🔍 Initializing gap evaluation service...");
    
    // Start periodic evaluation every 6 hours
    gapEvaluationService.startPeriodicEvaluation(6);
    
    // Run initial evaluation after 5 minutes (allow server to fully start)
    setTimeout(async () => {
      try {
        console.log("🚀 Running initial gap evaluation...");
        const result = await gapEvaluationService.evaluateAllOpenGaps();
        console.log(`📊 Initial evaluation: ${result.resolved}/${result.evaluated} gaps resolved`);
      } catch (error) {
        console.error("Initial gap evaluation error:", error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    console.log("✅ Gap evaluation service initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize gap evaluation service:", error);
  }
}

// Global cleanup function
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`📡 Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Stop gap evaluation service
    console.log("🛑 Stopping gap evaluation service...");
    gapEvaluationService.cleanup();
    
    // Disconnect WhatsApp service
    if (process.env.ENABLE_WHATSAPP === "true") {
      console.log("📱 Disconnecting WhatsApp service...");
      try {
        await whatsappService.disconnect();
      } catch (error) {
        console.error("Error disconnecting WhatsApp:", error);
      }
    }
    
    // Close server
    console.log("🔌 Closing HTTP server...");
    server.close((err) => {
      if (err) {
        console.error("Error closing server:", err);
        process.exit(1);
      }
      console.log("✅ HTTP server closed");
    });
    
    // Disconnect database
    await disconnectPrisma();
    
    console.log("✅ Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during graceful shutdown:", error);
    process.exit(1);
  }
}

const server = app.listen(PORT, async () => {
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

// Handle graceful shutdown
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGUSR2", () => gracefulShutdown("SIGUSR2")); // PM2 reload signal

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("🚨 Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});
