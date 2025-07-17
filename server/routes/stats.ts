// server/routes/stats.ts
import { Router } from "express";
import { statsService } from "../lib/stats-service";
import { authenticateToken, requireAdmin } from "../middleware/auth";

export const statsRouter = Router();

// All stats routes require authentication
statsRouter.use(authenticateToken);

// Dashboard stats (admin only)
statsRouter.get("/dashboard", requireAdmin, async (req, res) => {
  try {
    const stats = await statsService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// Chat volume data (admin only)
statsRouter.get("/chat-volume", requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const data = await statsService.getChatVolumeData(days);
    res.json(data);
  } catch (error) {
    console.error("Chat volume stats error:", error);
    res.status(500).json({ error: "Failed to fetch chat volume data" });
  }
});

// Knowledge gaps (admin only)
statsRouter.get("/knowledge-gaps", requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const gaps = await statsService.getKnowledgeGaps(limit);
    res.json(gaps);
  } catch (error) {
    console.error("Knowledge gaps error:", error);
    res.status(500).json({ error: "Failed to fetch knowledge gaps" });
  }
});

// Response quality (admin only)
statsRouter.get("/response-quality", requireAdmin, async (req, res) => {
  try {
    const quality = await statsService.getResponseQuality();
    res.json(quality);
  } catch (error) {
    console.error("Response quality error:", error);
    res.status(500).json({ error: "Failed to fetch response quality" });
  }
});

// Top queries (admin only)
statsRouter.get("/top-queries", requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const queries = await statsService.getTopQueries(limit);
    res.json(queries);
  } catch (error) {
    console.error("Top queries error:", error);
    res.status(500).json({ error: "Failed to fetch top queries" });
  }
});

// Category distribution (admin only)
statsRouter.get("/categories", requireAdmin, async (req, res) => {
  try {
    const categories = await statsService.getCategoryDistribution();
    res.json(categories);
  } catch (error) {
    console.error("Category distribution error:", error);
    res.status(500).json({ error: "Failed to fetch category distribution" });
  }
});

// Record query feedback
statsRouter.post("/feedback/:queryMatchId", async (req, res) => {
  try {
    const { queryMatchId } = req.params;
    const { wasHelpful } = req.body;

    if (typeof wasHelpful !== "boolean") {
      return res.status(400).json({ error: "wasHelpful must be a boolean" });
    }

    await statsService.updateQueryMatchFeedback(queryMatchId, wasHelpful);
    res.json({ success: true });
  } catch (error) {
    console.error("Feedback recording error:", error);
    res.status(500).json({ error: "Failed to record feedback" });
  }
});
