// server/routes/knowledge.ts
import { Router } from "express";
import { prisma } from "../lib/prisma";

export const knowledgeRouter = Router();

knowledgeRouter.get("/", async (req, res) => {
  try {
    const { category, page = "1", limit = "10" } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where = category ? { category: category as string } : {};

    const [entries, total] = await Promise.all([
      prisma.knowledgeEntry.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limitNum
      }),
      prisma.knowledgeEntry.count({ where })
    ]);

    res.json({
      entries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error("Knowledge GET error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

knowledgeRouter.post("/", async (req, res) => {
  try {
    const data = req.body;

    const entry = await prisma.knowledgeEntry.create({
      data: {
        ...data,
        createdBy: "admin" // Replace with actual user ID from auth
      }
    });

    // Create initial version
    await prisma.knowledgeVersion.create({
      data: {
        entryId: entry.id,
        content: entry.content,
        version: 1,
        createdBy: "admin"
      }
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error("Knowledge POST error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

knowledgeRouter.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const entry = await prisma.knowledgeEntry.update({
      where: { id },
      data: {
        ...data,
        keywords: data.keywords || [],
        tags: data.tags || []
      }
    });

    // Create new version
    const latestVersion = await prisma.knowledgeVersion.findFirst({
      where: { entryId: id },
      orderBy: { version: "desc" }
    });

    await prisma.knowledgeVersion.create({
      data: {
        entryId: id,
        content: data.content,
        version: (latestVersion?.version || 0) + 1,
        createdBy: "admin"
      }
    });

    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: "Failed to update entry" });
  }
});

knowledgeRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.knowledgeEntry.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete entry" });
  }
});
