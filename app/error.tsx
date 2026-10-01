"use client";

import { ErrorRecovery } from "@/src/components/error-recovery";

export default function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorRecovery boundary="route" error={error} retry={retry} />;
}
