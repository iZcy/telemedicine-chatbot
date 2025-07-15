// server/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { chatRouter } from "./routes/chat";
import { knowledgeRouter } from "./routes/knowledge";
import { healthRouter } from "./routes/health";

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
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/chat", chatRouter);
app.use("/api/knowledge", knowledgeRouter);
app.use("/health", healthRouter);

// Legacy health check (for backward compatibility)
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Telemedicine Chatbot API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      chat: "/api/chat",
      knowledge: "/api/knowledge",
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
      error: isDevelopment ? err.message : "Internal server error",
      timestamp: new Date().toISOString(),
      ...(isDevelopment && { stack: err.stack })
    });
  }
);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    timestamp: new Date().toISOString(),
    available_endpoints: {
      chat: "/api/chat",
      knowledge: "/api/knowledge",
      health: "/health",
      ai_health: "/health/ai",
      status: "/health/status"
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🤖 OpenAI configured: ${!!process.env.OPENAI_API_KEY}`);
  console.log(
    `🔄 DeepSeek fallback configured: ${!!process.env.DEEPSEEK_API_KEY}`
  );
  console.log(`📊 Health check available at: http://localhost:${PORT}/health`);
});
