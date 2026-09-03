import { NextResponse } from "next/server";

import hackathonConfig from "../../../../hackathon.config.json";

export const dynamic = "force-dynamic";

export function GET() {
  const aiProviderReady = Boolean(
    process.env.AI_PROVIDER && process.env.AI_API_KEY
  );

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
        narration: aiProviderReady ? "ai" : "template",
        evidence: "reviewed-fixture"
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
