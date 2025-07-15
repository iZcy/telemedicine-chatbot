import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const where = category ? { category } : {};

    const [entries, total] = await Promise.all([
      prisma.knowledgeEntry.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit
      }),
      prisma.knowledgeEntry.count({ where })
    ]);

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Knowledge GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

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

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Knowledge POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
