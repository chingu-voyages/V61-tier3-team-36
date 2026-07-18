import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: NextRequest,
  { params }: Params
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const body = await request.json();

  const requirement = await prisma.requirement.findUnique({
    where: { id },
    include: {
      project: true,
    },
  });

  if (!requirement) {
    return NextResponse.json(
      { error: "Requirement not found" },
      { status: 404 }
    );
  }

  if (requirement.project.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const updated = await prisma.requirement.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      priority: body.priority,
      status: body.status,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: Params
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const requirement = await prisma.requirement.findUnique({
    where: { id },
    include: {
      project: true,
    },
  });

  if (!requirement) {
    return NextResponse.json(
      { error: "Requirement not found" },
      { status: 404 }
    );
  }

  if (requirement.project.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  await prisma.requirement.delete({
    where: { id },
  });

  return NextResponse.json({
    success: true,
  });
}