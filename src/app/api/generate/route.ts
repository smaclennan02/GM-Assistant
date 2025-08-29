import { NextResponse } from "next/server";
import { z } from "zod";
import { generateNPC } from "@/lib/generators/npc";
import { generateMonster, types as monsterTypes } from "@/lib/generators/monster";

const BodySchema = z.object({
  tool: z.enum(["npc", "monster"]),
  options: z
    .object({
      ancestry: z.string().optional(), // npc-only
      occupation: z.string().optional(), // npc-only
      seed: z.string().optional(),
      crHint: z.number().int().min(0).max(10).optional(), // monster-only
      typeHint: z.enum([...monsterTypes]).optional(), // monster-only
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = BodySchema.parse(json);

    if (body.tool === "npc") {
      const npc = generateNPC({
        seed: body.options?.seed,
        ancestry: body.options?.ancestry,
        occupation: body.options?.occupation,
      });
      return NextResponse.json({ ok: true, data: npc });
    }

    if (body.tool === "monster") {
      const m = generateMonster({
        seed: body.options?.seed,
        crHint: body.options?.crHint,
        typeHint: body.options?.typeHint,
      });
      return NextResponse.json({ ok: true, data: m });
    }

    return NextResponse.json({ ok: false, error: "Tool not implemented." }, { status: 400 });
  } catch (err: unknown) {
    const message =
      err instanceof z.ZodError
        ? err.issues.map((e) => e.message).join(", ")
        : err instanceof Error
        ? err.message
        : "Invalid request";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
