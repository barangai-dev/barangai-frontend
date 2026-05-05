"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { useTheme } from "@/context/theme";
import { ChatSection } from "@/components/chatbot/ChatBot";

const STORAGE_KEY = "floating_chat_overlay_open";

function isSupportedRoute(pathname: string) {
  if (pathname === "/dashboard" || pathname === "/quizzes" || pathname === "/activities" || pathname === "/courses") {
    return true;
  }

  // Course detail pages: /courses/[id]
  if (/^\/courses\/\d+$/.test(pathname)) {
    return true;
  }

  // Topic pages: /courses/topic/[topic]
  if (/^\/courses\/topic\/[^/]+$/.test(pathname)) {
    return true;
  }

  return false;
}

export default function FloatingChatOverlay() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [open, setOpen] = useState(false);
  const canRender = useMemo(() => isSupportedRoute(pathname), [pathname]);

  useEffect(() => {
    if (!canRender) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setOpen(true);
    } catch {}
  }, [canRender]);

  useEffect(() => {
    if (!canRender) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(open));
    } catch {}
  }, [open, canRender]);

  if (!canRender) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <section
          className={`relative h-[36rem] w-[24rem] overflow-hidden rounded-2xl border shadow-2xl transition-all duration-300 ease-out animate-in fade-in zoom-in-95 slide-in-from-bottom-2 ${
            isDark ? "border-zinc-700 bg-zinc-900 text-zinc-100" : "border-zinc-200 bg-white text-zinc-900"
          }`}
        >
          <header
            className={`flex items-center justify-between px-4 py-3 transition-colors ${
              isDark ? "bg-zinc-800/80" : "bg-zinc-50"
            }`}
          >
            <div className="inline-flex items-center gap-2 text-sm font-semibold">
              <div className={`relative h-4 w-4 overflow-hidden rounded-sm ${isDark ? "ring-1 ring-zinc-700" : "ring-1 ring-zinc-200"}`}>
                <Image src="/favicon.ico" alt="BIDA icon" fill className="object-cover" />
              </div>
              BIDA
            </div>
            <button
              type="button"
              aria-label="Close BIDA overlay"
              onClick={() => setOpen(false)}
              className={`rounded-md p-1 transition-all duration-200 hover:scale-105 active:scale-95 ${
                isDark ? "hover:bg-zinc-700" : "hover:bg-zinc-200"
              }`}
            >
              <X size={16} />
            </button>
          </header>
          <div className={`h-[calc(100%-3rem)] ${isDark ? "bg-zinc-900" : "bg-white"}`}>
            <ChatSection compact />
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open BIDA overlay"
          className={`group inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 active:scale-95 ${
            isDark
              ? "bg-black/50 shadow-[#B4ED7C]/30"
              : "bg-brandGreen shadow-brandGreen/30"
          }`}
        >
          <div className="relative h-10 w-10 overflow-hidden rounded-sm">
            <Image src="/favicon.ico" alt="BIDA icon" fill className="object-cover" />
          </div>
        </button>
      )}
    </div>
  );
}
