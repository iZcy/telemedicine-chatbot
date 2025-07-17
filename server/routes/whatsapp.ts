// server/routes/whatsapp.ts
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
    await whatsappService.initialize();
    res.json({ success: true, message: "WhatsApp service initialized" });
  } catch (error) {
    console.error("WhatsApp initialization error:", error);
    res.status(500).json({ error: "Failed to initialize WhatsApp service" });
  }
});

// Get WhatsApp status
whatsappRouter.get("/status", async (req, res) => {
  try {
    const status = whatsappService.getStatus();
    res.json(status);
  } catch (error) {
    console.error("WhatsApp status error:", error);
    res.status(500).json({ error: "Failed to get WhatsApp status" });
  }
});

// Send bulk message
whatsappRouter.post("/bulk-message", async (req, res) => {
  try {
    const { phoneNumbers, message } = req.body;

    if (!Array.isArray(phoneNumbers) || !message) {
      return res
        .status(400)
        .json({ error: "phoneNumbers array and message are required" });
    }

    await whatsappService.sendBulkMessage(phoneNumbers, message);
    res.json({ success: true, message: "Bulk messages sent" });
  } catch (error) {
    console.error("Bulk message error:", error);
    res.status(500).json({ error: "Failed to send bulk messages" });
  }
});

// Disconnect WhatsApp
whatsappRouter.post("/disconnect", async (req, res) => {
  try {
    await whatsappService.disconnect();
    res.json({ success: true, message: "WhatsApp service disconnected" });
  } catch (error) {
    console.error("WhatsApp disconnect error:", error);
    res.status(500).json({ error: "Failed to disconnect WhatsApp service" });
  }
});
