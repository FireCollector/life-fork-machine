import type { Metadata } from "next";

import { ZhihuExpressionStudio } from "@/components/experience/zhihu-expression-studio";

export const metadata: Metadata = { title: "知乎表达草稿" };

export default function ZhihuDraftPage() {
  return <ZhihuExpressionStudio />;
}
