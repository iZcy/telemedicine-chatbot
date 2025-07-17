// server/routes/whatsapp.ts - Updated version
import { Router } from "express";
import { whatsappService } from "../lib/whatsapp-service";
import { authenticateToken, requireAdmin } from "../middleware/auth";

export const whatsappRouter = Router();

// All WhatsApp routes require admin authentication
whatsappRouter.use(authenticateToken);
whatsappRouter.use(requireAdmin);

// Initialize WhatsApp service
whatsappRouter.post("/initialize", async (req, res) => {
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
      details: error.message
    });
  }
});

// Get detailed WhatsApp status including QR code
whatsappRouter.get("/status", async (req, res) => {
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

// Send bulk message
whatsappRouter.post("/bulk-message", async (req, res) => {
  try {
    const { phoneNumbers, message } = req.body;

    if (!Array.isArray(phoneNumbers) || !message) {
      return res.status(400).json({
        error: "phoneNumbers array and message are required"
      });
    }

    if (!whatsappService.isReady()) {
      return res.status(400).json({
        error: "WhatsApp service is not ready. Please connect first."
      });
    }

    // Validate phone numbers
    const validNumbers = phoneNumbers.filter(
      (num) => typeof num === "string" && num.trim().length > 0
    );

    if (validNumbers.length === 0) {
      return res.status(400).json({
        error: "No valid phone numbers provided"
      });
    }

    console.log(`📤 Sending bulk message to ${validNumbers.length} numbers`);
    await whatsappService.sendBulkMessage(validNumbers, message);

    res.json({
      success: true,
      message: `Bulk messages sent to ${validNumbers.length} numbers`,
      sent: validNumbers.length
    });
  } catch (error) {
    console.error("Bulk message error:", error);
    res.status(500).json({
      error: "Failed to send bulk messages",
      details: error.message
    });
  }
});

// Disconnect WhatsApp
whatsappRouter.post("/disconnect", async (req, res) => {
  try {
    console.log("🔌 WhatsApp disconnection requested by admin");
    await whatsappService.disconnect();
    res.json({
      success: true,
      message: "WhatsApp service disconnected successfully"
    });
  } catch (error) {
    console.error("WhatsApp disconnect error:", error);
    res.status(500).json({
      error: "Failed to disconnect WhatsApp service",
      details: error.message
    });
  }
});

// Get connection logs
whatsappRouter.get("/logs", async (req, res) => {
  try {
    const logs = whatsappService.getConnectionLogs();
    res.json({ logs });
  } catch (error) {
    console.error("WhatsApp logs error:", error);
    res.status(500).json({
      error: "Failed to get WhatsApp logs"
    });
  }
});

// Test connection
whatsappRouter.post("/test", async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        error: "phoneNumber and message are required"
      });
    }

    if (!whatsappService.isReady()) {
      return res.status(400).json({
        error: "WhatsApp service is not ready"
      });
    }

    await whatsappService.sendTestMessage(phoneNumber, message);
    res.json({
      success: true,
      message: "Test message sent successfully"
    });
  } catch (error) {
    console.error("WhatsApp test error:", error);
    res.status(500).json({
      error: "Failed to send test message",
      details: error.message
    });
  }
});
