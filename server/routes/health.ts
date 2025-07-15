// server/routes/health.ts
import { Router } from "express";
import { aiServiceManager } from "../lib/ai-service-manager";

export const healthRouter = Router();

// Basic health check
healthRouter.get("/", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Telemedicine Chatbot API"
  });
});

// AI services health check
healthRouter.get("/ai", async (req, res) => {
  try {
    const healthStatus = await aiServiceManager.healthCheck();

    const overallStatus =
      healthStatus.openai.status === "ok" ||
      healthStatus.deepseek.status === "ok"
        ? "healthy"
        : "degraded";

    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        openai: {
          status: healthStatus.openai.status,
          latency: healthStatus.openai.latency,
          configured: !!process.env.OPENAI_API_KEY
        },
        deepseek: {
          status: healthStatus.deepseek.status,
          latency: healthStatus.deepseek.latency,
          configured: !!process.env.DEEPSEEK_API_KEY
        }
      },
      fallback_available: !!process.env.DEEPSEEK_API_KEY
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Failed to perform health check"
    });
  }
});

// Detailed system status
healthRouter.get("/status", async (req, res) => {
  try {
    const healthStatus = await aiServiceManager.healthCheck();

    res.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      ai_services: {
        primary: {
          provider: "OpenAI",
          status: healthStatus.openai.status,
          latency_ms: healthStatus.openai.latency,
          configured: !!process.env.OPENAI_API_KEY,
          model: "gpt-4 / gpt-3.5-turbo"
        },
        fallback: {
          provider: "DeepSeek",
          status: healthStatus.deepseek.status,
          latency_ms: healthStatus.deepseek.latency,
          configured: !!process.env.DEEPSEEK_API_KEY,
          model: "deepseek-r1:free"
        }
      },
      database: {
        connected: true, // You can add actual DB health check here
        url_configured: !!process.env.DATABASE_URL
      },
      features: {
        knowledge_base: true,
        symptom_extraction: true,
        conversation_history: true,
        analytics: true
      }
    });
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Failed to get system status"
    });
  }
});
