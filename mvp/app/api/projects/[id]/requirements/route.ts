import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!project) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
    );
  }

  const requirements = await prisma.requirement.findMany({
    where: {
      projectId: id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(requirements);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!project) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
    );
  }

  const body = await request.json();

  const requirement = await prisma.requirement.create({
    data: {
      title: body.title,
      description: body.description,
      priority: body.priority,
      status: body.status,
      projectId: id,
    },
  });

  return NextResponse.json(requirement, { status: 201 });
}