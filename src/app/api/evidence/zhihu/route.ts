import { NextResponse } from "next/server";
import { searchZhihuEvidence } from "@/server/evidence/zhihu-search";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const result = await searchZhihuEvidence(await request.json());
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch {
    return NextResponse.json(
      {
        status: "unavailable",
        items: [],
        message: "议题简报格式不完整，未发起知乎检索。",
        cached: false
      },
      { status: 400 }
    );
  }
}
