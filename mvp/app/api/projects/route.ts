import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description,
        deadline: body.deadline
          ? new Date(body.deadline)
          : null,
        userId: session.user.id,
      },
    });

    return NextResponse.json(project, {
      status: 201,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Failed to create project" },
      { status: 500 }
    );
  }
}