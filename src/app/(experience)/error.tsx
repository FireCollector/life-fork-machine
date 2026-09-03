"use client";

import { PageError } from "@/components/experience/page-error";

export default function ExperienceError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageError reset={reset} />;
}
