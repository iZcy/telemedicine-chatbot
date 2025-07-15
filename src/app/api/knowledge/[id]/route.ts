import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const { id } = params;

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
        createdBy: "admin" // Replace with actual user
      }
    });

    return NextResponse.json(entry);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.knowledgeEntry.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete entry" },
      { status: 500 }
    );
  }
}
