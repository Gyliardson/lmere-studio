import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { compareSync } from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { slug, password } = await request.json();

    if (!slug || !password) {
      return NextResponse.json({ error: "Credenciais ausentes" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug } });

    if (!tenant) {
      return NextResponse.json({ error: "Atelie nao encontrado" }, { status: 404 });
    }

    const valid = compareSync(password, tenant.adminPasswordHash);
    if (!valid) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }

    const token = Buffer.from(`${tenant.id}:${Date.now()}`).toString("base64");

    return NextResponse.json({
      token,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      },
    });
  } catch (error) {
    console.error("[ERROR] Auth failed:", error);
    return NextResponse.json({ error: "Erro na autenticacao" }, { status: 500 });
  }
}
