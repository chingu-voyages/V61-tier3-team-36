import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description,
        deadline: body.deadline
          ? new Date(body.deadline)
          : null,
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