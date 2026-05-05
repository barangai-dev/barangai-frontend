"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function QuizzesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    router.replace(query ? `/activities?${query}` : "/activities");
  }, [router, searchParams]);

  return null;
}
