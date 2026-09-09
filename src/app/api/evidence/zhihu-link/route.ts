import { NextResponse } from "next/server";

import { importZhihuLink } from "@/server/evidence/zhihu-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const result = await importZhihuLink(await request.json());
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unavailable",
        items: [],
        cached: false,
        match: "none",
        message:
          error instanceof Error
            ? error.message
            : "链接格式不完整，未发起知乎检索。"
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}
