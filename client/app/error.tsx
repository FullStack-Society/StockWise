"use client";

import ErrorState from "@/components/ui/ErrorState";

export default function AppSegmentError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState onRetry={reset} />;
}
