// server/routes/health.ts - Enhanced with AI retry testing
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
          configured: !!process.env.DEEPSEEK_API_KEY,
          attempts: healthStatus.deepseek.attempts,
          lastError: healthStatus.deepseek.lastError
        }
      },
      primary_service: "DeepSeek",
      retry_config: aiServiceManager.getRetryConfig()
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

// 🧪 NEW: Test AI with retry logic
healthRouter.post("/ai/test", async (req, res) => {
  try {
    const {
      message = "Test pesan untuk AI",
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000
    } = req.body;

    console.log("🧪 Testing AI service with retry logic...");

    const testResult = await aiServiceManager.testAPIWithRetry(message, {
      maxRetries,
      baseDelay,
      maxDelay,
      backoffMultiplier: 2
    });

    res.json({
      timestamp: new Date().toISOString(),
      test_message: message,
      retry_config: {
        maxRetries,
        baseDelay,
        maxDelay
      },
      result: testResult
    });
  } catch (error) {
    console.error("AI test error:", error);
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Gagal melakukan tes AI service"
    });
  }
});

// 🔧 NEW: Update retry configuration
healthRouter.post("/ai/retry-config", async (req, res) => {
  try {
    const { maxRetries, baseDelay, maxDelay, backoffMultiplier } = req.body;

    // Validate input
    const newConfig: any = {};
    if (typeof maxRetries === "number" && maxRetries >= 0 && maxRetries <= 10) {
      newConfig.maxRetries = maxRetries;
    }
    if (
      typeof baseDelay === "number" &&
      baseDelay >= 100 &&
      baseDelay <= 10000
    ) {
      newConfig.baseDelay = baseDelay;
    }
    if (typeof maxDelay === "number" && maxDelay >= 1000 && maxDelay <= 60000) {
      newConfig.maxDelay = maxDelay;
    }
    if (
      typeof backoffMultiplier === "number" &&
      backoffMultiplier >= 1 &&
      backoffMultiplier <= 5
    ) {
      newConfig.backoffMultiplier = backoffMultiplier;
    }

    if (Object.keys(newConfig).length === 0) {
      return res.status(400).json({
        error: "No valid configuration provided",
        valid_ranges: {
          maxRetries: "0-10",
          baseDelay: "100-10000ms",
          maxDelay: "1000-60000ms",
          backoffMultiplier: "1-5"
        }
      });
    }

    aiServiceManager.updateRetryConfig(newConfig);

    res.json({
      success: true,
      message: "Retry configuration updated",
      new_config: aiServiceManager.getRetryConfig(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Config update error:", error);
    res.status(500).json({
      error: "Failed to update retry configuration"
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
        model: "deepseek-chat-v3-0324",
        retry_enabled: true,
        retry_config: aiServiceManager.getRetryConfig(),
        last_error: healthStatus.deepseek.lastError
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
        whatsapp_integration: process.env.ENABLE_WHATSAPP === "true",
        ai_retry_logic: true
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
