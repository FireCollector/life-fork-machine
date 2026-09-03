import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { EmptyState } from "@/components/experience/route-states";
import { Button } from "@/components/ui/button";

export default function ResultNotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <EmptyState
        action={
          <Button asChild>
            <Link href="/">返回人生实验入口</Link>
          </Button>
        }
        description="这个匿名结果不存在、格式无效或尚未生成。我们不会用猜测补造一份报告。"
        icon={FileQuestion}
        title="还没有这份代价报告"
      />
    </main>
  );
}
