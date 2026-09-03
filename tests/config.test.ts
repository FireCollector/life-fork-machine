import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("hackathon configuration", () => {
  it("keeps OAuth disabled and excludes OAuth credentials", async () => {
    const raw = await readFile(
      resolve(process.cwd(), "hackathon.config.json"),
      "utf8"
    );
    const config = JSON.parse(raw) as { oauth: Record<string, unknown> };

    expect(config.oauth.enabled).toBe(false);
    expect(config.oauth).not.toHaveProperty("appId");
    expect(config.oauth).not.toHaveProperty("appKey");
    expect(config.oauth).not.toHaveProperty("redirectUri");
  });
});
