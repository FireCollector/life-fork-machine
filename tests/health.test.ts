import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("reports safe no-OAuth fallback state without secret fields", async () => {
    const response = GET();
    const body = (await response.json()) as Record<string, unknown>;
    const serialized = JSON.stringify(body).toLowerCase();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      zhihu: {
        oauthEnabled: false,
        contentMode: "reviewed-fixture",
        credentialExposure: "server-only"
      },
      ai: {
        mode: "demo-cache",
        credentialExposure: "server-only"
      }
    });
    expect(serialized).not.toContain("access_secret");
    expect(serialized).not.toContain("api_key");
  });
});
