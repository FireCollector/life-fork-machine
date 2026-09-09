import type { Metadata } from "next";

import { ZhihuLinkImport } from "@/components/experience/zhihu-link-import";

export const metadata: Metadata = { title: "从知乎链接开始" };

export default function ZhihuImportPage() {
  return <ZhihuLinkImport />;
}
