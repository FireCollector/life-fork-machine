import { z } from "zod";

const ZhihuHostSchema = z.enum([
  "www.zhihu.com",
  "zhihu.com",
  "zhuanlan.zhihu.com"
]);

export const ZhihuLinkSchema = z
  .string()
  .trim()
  .url()
  .max(1_500)
  .transform((value, context) => {
    try {
      const parsed = new URL(value);
      const host = parsed.hostname.toLowerCase();
      if (
        !ZhihuHostSchema.safeParse(host).success ||
        parsed.protocol !== "https:"
      ) {
        context.addIssue({
          code: "custom",
          message: "请粘贴 https 的知乎问题、回答或文章链接。"
        });
        return z.NEVER;
      }
      const path = parsed.pathname.replace(/\/+$/, "");
      const question = path.match(/^\/question\/(\d+)/);
      const answer = path.match(/^\/answer\/(\d+)/);
      const article =
        host === "zhuanlan.zhihu.com" ? path.match(/^\/p\/(\d+)/) : null;
      const matched = question ?? answer ?? article;
      if (!matched) {
        context.addIssue({
          code: "custom",
          message: "目前支持知乎 question、answer 和专栏文章 p 链接。"
        });
        return z.NEVER;
      }
      const kind = question ? "question" : answer ? "answer" : "article";
      const canonicalHost =
        kind === "article" ? "zhuanlan.zhihu.com" : "www.zhihu.com";
      const canonicalPath =
        kind === "article" ? `/p/${matched[1]}` : `/${kind}/${matched[1]}`;
      return {
        url: `https://${canonicalHost}${canonicalPath}`,
        kind,
        contentId: matched[1]
      };
    } catch {
      context.addIssue({ code: "custom", message: "链接格式不正确。" });
      return z.NEVER;
    }
  });

export type ZhihuLink = z.infer<typeof ZhihuLinkSchema>;

export function canonicalZhihuUrl(value: string) {
  const parsed = ZhihuLinkSchema.safeParse(value);
  return parsed.success ? parsed.data.url : undefined;
}
