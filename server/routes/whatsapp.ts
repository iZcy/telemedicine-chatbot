// server/routes/whatsapp.ts - Updated with session management endpoints
import { Router } from "express";
import { whatsappService } from "../lib/whatsapp-service";
import { authenticateToken, requireAdmin } from "../middleware/auth";

export const whatsappRouter = Router();

// All WhatsApp routes require admin authentication
whatsappRouter.use(authenticateToken);
whatsappRouter.use(requireAdmin);

// Initialize WhatsApp service
whatsappRouter.post("/initialize", async (_req, res) => {
  try {
    console.log("🚀 WhatsApp initialization requested by admin");
    await whatsappService.initialize();
    res.json({
      success: true,
      message: "WhatsApp service initialization started",
      status: "connecting"
    });
  } catch (error) {
    console.error("WhatsApp initialization error:", error);
    res.status(500).json({
      error: "Failed to initialize WhatsApp service",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get detailed WhatsApp status including QR code
whatsappRouter.get("/status", async (_req, res) => {
  try {
    const basicStatus = whatsappService.getStatus();
    const detailedStatus = whatsappService.getDetailedStatus();

    res.json({
      ...basicStatus,
      ...detailedStatus,
      connectionState: whatsappService.getConnectionState(),
      qrCode: whatsappService.getCurrentQRCode(),
      lastConnected: whatsappService.getLastConnectedTime(),
      error: whatsappService.getLastError()
    });
  } catch (error) {
    console.error("WhatsApp status error:", error);
    res.status(500).json({
      error: "Failed to get WhatsApp status",
      connectionState: "ERROR"
    });
  }
});

// 🧹 NEW: Force logout endpoint (clears auth data)
whatsappRouter.post("/force-logout", async (_req, res) => {
  try {
    console.log("🔓 WhatsApp force logout requested by admin");

    const result = await whatsappService.forceLogout();

    res.json({
      success: true,
      message: "WhatsApp force logout completed",
      sessionsCleared: result.cleared,
      authCleared: result.authCleared
    });
  } catch (error) {
    console.error("WhatsApp force logout error:", error);
    res.status(500).json({
      error: "Failed to force logout WhatsApp service",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Disconnect WhatsApp (now with auth cleanup)
whatsappRouter.post("/disconnect", async (_req, res) => {
  try {
    console.log("🔌 WhatsApp disconnection requested by admin");

    // Get session info before disconnecting
    const sessionInfo = whatsappService.getSessionInfo();

    await whatsappService.disconnect();

    res.json({
      success: true,
      message: "WhatsApp service disconnected and auth cleared",
      sessionsCleared: sessionInfo.activeCount,
      authCleared: true
    });
  } catch (error) {
    console.error("WhatsApp disconnect error:", error);
    res.status(500).json({
      error: "Failed to disconnect WhatsApp service",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// 🧹 NEW: Clear sessions endpoint
whatsappRouter.post("/clear-sessions", async (_req, res) => {
  try {
    console.log("🧹 WhatsApp session clear requested by admin");

    const result = await whatsappService.clearSessions();

    res.json({
      success: true,
      message: `Cleared ${result.cleared} active sessions`,
      sessionsCleared: result.cleared
    });
  } catch (error) {
    console.error("WhatsApp clear sessions error:", error);
    res.status(500).json({
      error: "Failed to clear sessions",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// 🧹 NEW: Get session information
whatsappRouter.get("/sessions", async (_req, res) => {
  try {
    const sessionInfo = whatsappService.getSessionInfo();

    res.json({
      success: true,
      ...sessionInfo
    });
  } catch (error) {
    console.error("WhatsApp sessions info error:", error);
    res.status(500).json({
      error: "Failed to get session information"
    });
  }
});

// Get connection logs
whatsappRouter.get("/logs", async (_req, res) => {
  try {
    const logs = whatsappService.getConnectionLogs();
    res.json({
      logs,
      totalLogs: logs.length,
      currentState: whatsappService.getConnectionState()
    });
  } catch (error) {
    console.error("WhatsApp logs error:", error);
    res.status(500).json({
      error: "Failed to get WhatsApp logs"
    });
  }
});
