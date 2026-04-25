import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createFakeAccounts,
  deleteAllFakeAccounts,
  deleteFakeAccountByEmail,
  deleteFakeAccountById,
  getFakeAccountStats,
  listFakeAccounts,
} from "@/lib/email-testing/fake-accounts-repo";
import type { FakeAccountRole } from "@/types/email-testing";

export const runtime = "nodejs";

const createSchema = z.object({
  count: z.number().int().min(1).max(50).default(1),
  role: z.enum(["candidate", "recruiter"]).default("candidate"),
});

const deleteSchema = z.object({
  id: z.string().optional(),
  email: z.string().email().optional(),
  deleteAll: z.boolean().optional(),
});

function parseRole(value: string | null): FakeAccountRole | undefined {
  if (value === "candidate" || value === "recruiter") {
    return value;
  }
  return undefined;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = parseRole(searchParams.get("role"));

    const [items, stats] = await Promise.all([
      listFakeAccounts({ role }),
      getFakeAccountStats(),
    ]);

    return NextResponse.json({
      role: role || "all",
      items,
      stats: {
        ...stats,
        filtered: items.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list fake accounts.";
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = createSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const created = await createFakeAccounts(parsed.data.count, parsed.data.role);
    const [items, stats] = await Promise.all([
      listFakeAccounts(),
      getFakeAccountStats(),
    ]);

    return NextResponse.json(
      {
        created,
        items,
        stats: {
          ...stats,
          filtered: items.length,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create fake accounts.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { deleteAll, id, email } = parsed.data;

    if (deleteAll) {
      const result = await deleteAllFakeAccounts();
      return NextResponse.json({
        ok: true,
        deletedCount: result.deletedCount,
        stats: {
          total: 0,
          candidate: 0,
          recruiter: 0,
          filtered: 0,
        },
      });
    }

    if (id) {
      const result = await deleteFakeAccountById(id);
      const stats = await getFakeAccountStats();
      return NextResponse.json({
        ok: result.deletedCount > 0,
        deletedCount: result.deletedCount,
        stats: {
          ...stats,
          filtered: stats.total,
        },
      });
    }

    if (email) {
      const result = await deleteFakeAccountByEmail(email);
      const stats = await getFakeAccountStats();
      return NextResponse.json({
        ok: result.deletedCount > 0,
        deletedCount: result.deletedCount,
        stats: {
          ...stats,
          filtered: stats.total,
        },
      });
    }

    return NextResponse.json(
      {
        error: "Provide one of: id, email, or deleteAll=true.",
      },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete fake account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
