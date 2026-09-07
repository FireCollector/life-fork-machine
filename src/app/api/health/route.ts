import { NextResponse } from "next/server";

import hackathonConfig from "../../../../hackathon.config.json";
import { aiGateway } from "@/server/ai";

export const dynamic = "force-dynamic";

export function GET() {
  const ai = aiGateway.status();

  return NextResponse.json(
    {
      ok: true,
      app: {
        name: "人生分岔机",
        version: "0.1.0"
      },
      zhihu: {
        oauthEnabled: hackathonConfig.oauth.enabled,
        contentMode: "reviewed-fixture",
        credentialExposure: "server-only"
      },
      fallback: {
        narration: ai.mode === "realtime-ready" ? "ai" : "template",
        evidence: "reviewed-fixture"
      },
      ai: {
        mode: ai.mode,
        provider: ai.provider,
        model: ai.model,
        credentialExposure: "server-only"
      }
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    }
  );
}
