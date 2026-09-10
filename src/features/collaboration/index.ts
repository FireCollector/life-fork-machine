import { z } from "zod";

const Text = z.string().trim().min(1).max(240);
export const CollaborationInviteSchema = z
  .object({
    version: z.literal(1),
    topic: Text,
    question: Text,
    expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    context: z.array(Text).max(2)
  })
  .strict();
export const CollaborationReplySchema = z
  .object({ kind: z.enum(["fact", "view", "support"]), text: Text })
  .strict();
export type CollaborationInvite = z.infer<typeof CollaborationInviteSchema>;

function base64(value: string) {
  return btoa(unescape(encodeURIComponent(value)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
function unbase64(value: string) {
  const padded =
    value.replaceAll("-", "+").replaceAll("_", "/") +
    "===".slice((value.length + 3) % 4);
  return decodeURIComponent(escape(atob(padded)));
}

export function createCollaborationLink(
  invite: CollaborationInvite,
  origin: string
) {
  const parsed = CollaborationInviteSchema.parse(invite);
  return `${origin}/collab#invite=${base64(JSON.stringify(parsed))}`;
}
export function parseCollaborationInvite(hash: string) {
  const encoded = new URLSearchParams(hash.replace(/^#/, "")).get("invite");
  if (!encoded) return undefined;
  try {
    return CollaborationInviteSchema.safeParse(JSON.parse(unbase64(encoded)))
      .data;
  } catch {
    return undefined;
  }
}
export function formatContribution(
  reply: z.infer<typeof CollaborationReplySchema>
) {
  const value = CollaborationReplySchema.parse(reply);
  const labels = { fact: "事实补充", view: "个人观点", support: "情绪支持" };
  return `【${labels[value.kind]}】${value.text}`;
}
