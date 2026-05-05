"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function QuizzesPage() {
  const router = useRouter();

  useEffect(() => {
    const query = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
    router.replace(query ? `/activities?${query}` : "/activities");
  }, [router]);

  return null;
}
