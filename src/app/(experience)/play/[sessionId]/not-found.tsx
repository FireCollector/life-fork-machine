import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { EmptyState } from "@/components/experience/route-states";
import { Button } from "@/components/ui/button";

export default function PlayNotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <EmptyState
        action={
          <Button asChild>
            <Link href="/calibrate">重新创建匿名会话</Link>
          </Button>
        }
        description="这个匿名会话不存在、格式无效或已经过期。当前没有任何真实选择被提交。"
        icon={FileQuestion}
        title="没有找到这条世界线"
      />
    </main>
  );
}
