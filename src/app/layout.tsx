import type { Metadata, Viewport } from "next";

import { AppShell } from "@/components/layout/app-shell";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "人生分岔机",
    template: "%s｜人生分岔机"
  },
  description: "用三条平行人生看见选择的收益、代价与未知。"
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0a0e19",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="zh-CN">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
