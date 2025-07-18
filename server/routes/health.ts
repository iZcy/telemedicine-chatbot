// server/routes/health.ts
import { Router } from "express";
import { aiServiceManager } from "../lib/ai-service-manager";

export const healthRouter = Router();

// Basic health check
healthRouter.get("/", (_req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "API Chatbot Medis Telemedicine"
  });
});

// AI services health check
healthRouter.get("/ai", async (_req, res) => {
  try {
    const healthStatus = await aiServiceManager.healthCheck();

    const overallStatus =
      healthStatus.deepseek.status === "ok" ? "healthy" : "degraded";

    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        deepseek: {
          status: healthStatus.deepseek.status,
          latency: healthStatus.deepseek.latency,
          configured: !!process.env.DEEPSEEK_API_KEY
        }
      },
      primary_service: "DeepSeek"
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Gagal melakukan pemeriksaan kesehatan"
    });
  }
});

// Detailed system status
healthRouter.get("/status", async (_req, res) => {
  try {
    const healthStatus = await aiServiceManager.healthCheck();

    res.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      ai_service: {
        provider: "DeepSeek",
        status: healthStatus.deepseek.status,
        latency_ms: healthStatus.deepseek.latency,
        configured: !!process.env.DEEPSEEK_API_KEY,
        model: "deepseek-chat"
      },
      database: {
        connected: true, // You can add actual DB health check here
        url_configured: !!process.env.DATABASE_URL
      },
      whatsapp: {
        enabled: process.env.ENABLE_WHATSAPP === "true",
        configured: !!process.env.ENABLE_WHATSAPP
      },
      features: {
        knowledge_base: true,
        rag_search: true,
        symptom_extraction: true,
        conversation_history: true,
        analytics: true,
        whatsapp_integration: process.env.ENABLE_WHATSAPP === "true"
      }
    });
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Gagal mendapatkan status sistem"
    });
  }
});
