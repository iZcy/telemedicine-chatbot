// server/routes/whatsapp.ts - Updated bulk message route
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

// Send bulk message with improved error handling
whatsappRouter.post("/bulk-message", async (req, res) => {
  try {
    const { phoneNumbers, message } = req.body;

    // Validation
    if (!Array.isArray(phoneNumbers) || !message) {
      return res.status(400).json({
        error: "phoneNumbers array and message are required"
      });
    }

    if (!whatsappService.isReady()) {
      return res.status(400).json({
        error: "WhatsApp service is not ready. Please connect first.",
        currentState: whatsappService.getConnectionState()
      });
    }

    // Clean and validate phone numbers
    const validNumbers = phoneNumbers
      .map((num) => (typeof num === "string" ? num.trim() : ""))
      .filter((num) => num.length > 0)
      .filter((num) => {
        // Basic phone number validation
        const cleaned = num.replace(/[^\d+]/g, "");
        return cleaned.length >= 10; // Minimum phone number length
      });

    if (validNumbers.length === 0) {
      return res.status(400).json({
        error: "No valid phone numbers provided",
        hint: "Phone numbers should be in format: +6281234567890 or 081234567890"
      });
    }

    if (message.trim().length === 0) {
      return res.status(400).json({
        error: "Message cannot be empty"
      });
    }

    if (message.length > 4096) {
      return res.status(400).json({
        error: "Message too long. Maximum 4096 characters allowed."
      });
    }

    console.log(`📤 Sending bulk message to ${validNumbers.length} numbers`);
    console.log(`Message preview: ${message.substring(0, 100)}...`);

    // Send bulk messages with detailed results
    const results = await whatsappService.sendBulkMessage(
      validNumbers,
      message
    );

    // Determine response status based on results
    const hasFailures = results.failed > 0;
    const allFailed = results.success === 0;

    const responseData = {
      success: !allFailed,
      message: allFailed
        ? "All messages failed to send"
        : hasFailures
        ? `Bulk message completed with some failures`
        : "All messages sent successfully",
      results: {
        total: validNumbers.length,
        successful: results.success,
        failed: results.failed,
        errors: results.errors
      },
      details: {
        successRate: `${Math.round(
          (results.success / validNumbers.length) * 100
        )}%`,
        processedNumbers: validNumbers.length,
        originalNumbers: phoneNumbers.length
      }
    };

    // Return appropriate status code
    if (allFailed) {
      res.status(500).json(responseData);
    } else if (hasFailures) {
      res.status(207).json(responseData); // Multi-status for partial success
    } else {
      res.status(200).json(responseData);
    }
  } catch (error) {
    console.error("Bulk message error:", error);
    res.status(500).json({
      error: "Failed to send bulk messages",
      details: error.message,
      currentState: whatsappService.getConnectionState()
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

// Test connection with a single message
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
        error: "WhatsApp service is not ready",
        currentState: whatsappService.getConnectionState()
      });
    }

    console.log(`🧪 Sending test message to ${phoneNumber}`);
    await whatsappService.sendTestMessage(phoneNumber, message);

    res.json({
      success: true,
      message: "Test message sent successfully",
      sentTo: phoneNumber,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("WhatsApp test error:", error);
    res.status(500).json({
      error: "Failed to send test message",
      details: error.message,
      currentState: whatsappService.getConnectionState()
    });
  }
});

// Validate phone numbers endpoint
whatsappRouter.post("/validate-numbers", async (req, res) => {
  try {
    const { phoneNumbers } = req.body;

    if (!Array.isArray(phoneNumbers)) {
      return res.status(400).json({
        error: "phoneNumbers array is required"
      });
    }

    if (!whatsappService.isReady()) {
      return res.status(400).json({
        error: "WhatsApp service is not ready",
        currentState: whatsappService.getConnectionState()
      });
    }

    const validationResults = [];

    for (const phoneNumber of phoneNumbers) {
      try {
        // This would require implementing phone number validation in the service
        // For now, we'll do basic format validation
        const cleaned = phoneNumber.replace(/[^\d+]/g, "");
        const isValid = cleaned.length >= 10;

        validationResults.push({
          original: phoneNumber,
          formatted: cleaned,
          isValid,
          reason: isValid ? "Valid format" : "Invalid format or too short"
        });
      } catch (error) {
        validationResults.push({
          original: phoneNumber,
          formatted: null,
          isValid: false,
          reason: error.message
        });
      }
    }

    const validCount = validationResults.filter((r) => r.isValid).length;

    res.json({
      success: true,
      results: validationResults,
      summary: {
        total: phoneNumbers.length,
        valid: validCount,
        invalid: phoneNumbers.length - validCount,
        validationRate: `${Math.round(
          (validCount / phoneNumbers.length) * 100
        )}%`
      }
    });
  } catch (error) {
    console.error("Phone validation error:", error);
    res.status(500).json({
      error: "Failed to validate phone numbers",
      details: error.message
    });
  }
});
