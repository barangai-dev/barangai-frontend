"use client";

import { HiSearch } from "react-icons/hi";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "@/context/theme";
import { useI18n, languageOptions, Language } from "@/context/i18n";

// Safely import the ProfileMenu only on the client side to prevent Vercel SSR crashes
const ProfileMenu = dynamic(() => import("@/components/ui/ProfileMenu"), {
  ssr: false,
});

type Props = {
  hideSearch?: boolean;
  // controlled search value (optional). If provided, TopBar will act as a controlled input.
  searchValue?: string;
  // called when the search input changes
  onSearch?: (val: string) => void;
};

export default function TopBar({ hideSearch = false, searchValue, onSearch }: Props) {
  const [internalQuery, setInternalQuery] = useState("");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const { theme, toggle } = useTheme();
  const { language, setLanguage, t } = useI18n();
  const isDark = theme === "dark";

  const value = typeof searchValue === "string" ? searchValue : internalQuery;
  const handleChange = (v: string) => {
    if (onSearch) onSearch(v);
    else setInternalQuery(v);
  };

  const selectedLanguageLabel =
    language === "en" ? t("common.english") : language === "tl" ? t("common.tagalog") : t("common.bisaya");

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!languageMenuRef.current?.contains(event.target as Node)) {
        setLanguageMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div className="w-full">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4 py-2">
        {/* left - reserved for title/controls (keeps layout balanced) */}
        <div className="flex items-center gap-4 min-w-0">
          {/* small placeholder to keep the left edge visually aligned with content */}
          <div className="text-sm font-medium text-gray-500 dark:text-gray-300 truncate hidden sm:block">&nbsp;</div>
        </div>

        {/* center - search (compact, not full-bleed) */}
        {!hideSearch && (
          <div className="flex-1 max-w-[640px] w-full">
            <div className="relative">
              <input
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={t("topbar.searchPlaceholder")}
                className={isDark ? "w-full bg-[#0b0b0b] text-sm text-gray-200 rounded-full px-4 py-2 pl-10 border border-transparent focus:outline-none" : "w-full bg-white/90 text-sm text-gray-800 rounded-full px-4 py-2 pl-10 border border-transparent focus:outline-none"}
              />
              <HiSearch className={isDark ? "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" : "absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"} />
            </div>
          </div>
        )}

        {/* right - actions */}
        <div className="flex items-center gap-3">
          <button
            aria-label={`${t("topbar.switchThemeTo")} ${theme === "light" ? t("topbar.modeDark") : t("topbar.modeLight")} ${t("common.settings")}`}
            onClick={toggle}
            className="group inline-flex items-center gap-2 rounded-full px-2 py-1 transition"
            title={`${t("topbar.switchThemeTo")} ${theme === "light" ? t("topbar.modeDark") : t("topbar.modeLight")} mode`}
          >
            <span
              className={`text-sm font-semibold transition ${
                isDark ? "text-zinc-400 group-hover:text-zinc-200" : "text-[#1f2a44]"
              }`}
            >
              {t("topbar.modeLight")}
            </span>
            <span
              className={`relative inline-flex h-9 w-20 items-center rounded-full border px-1 transition ${
                isDark
                  ? "border-[#2f3a2f] bg-[#034440]"
                  : "border-[#7fb85a] bg-[#9DE16A]"
              }`}
            >
              <span
                className={`h-7 w-7 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.2)] transition-transform duration-300 ${
                  isDark ? "translate-x-10 bg-[#9DE16A]" : "translate-x-0 bg-white"
                }`}
              />
              <span className="pointer-events-none absolute right-4 top-2 h-1.5 w-1.5 rounded-full bg-white/80" />
              <span className="pointer-events-none absolute right-2.5 top-4 h-1.5 w-1.5 rounded-full bg-white/60" />
            </span>
            <span
              className={`text-sm font-semibold transition ${
                isDark ? "text-[#9DE16A]" : "text-zinc-400 group-hover:text-zinc-600"
              }`}
            >
              {t("topbar.modeDark")}
            </span>
          </button>
          <div ref={languageMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setLanguageMenuOpen((open) => !open)}
              aria-haspopup="listbox"
              aria-expanded={languageMenuOpen}
              aria-label={t("common.language")}
              className={`group inline-flex h-11 min-w-[132px] items-center justify-between gap-2 rounded-full border px-3.5 text-sm font-semibold shadow-[0_10px_28px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all duration-200 ${
                isDark
                  ? "border-[#34523c] bg-[#101b14]/90 text-[#e6f7dc] hover:border-[#9DE16A]/55 hover:bg-[#14251a]"
                  : "border-[#d6e9cf] bg-white/90 text-[#1f2a44] hover:border-[#9DE16A] hover:bg-[#f7fff2]"
              }`}
            >
              <span
                className={`grid h-7 w-7 place-items-center rounded-full transition ${
                  isDark
                    ? "bg-[#9DE16A]/12 text-[#9DE16A] group-hover:bg-[#9DE16A]/18"
                    : "bg-[#5A9B29]/10 text-[#4f8d3a] group-hover:bg-[#9DE16A]/35"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                  <path
                    d="M3.5 12h17M12 3.5c2.5 2.6 3.9 5.5 3.9 8.5s-1.4 5.9-3.9 8.5M12 3.5C9.5 6.1 8.1 9 8.1 12s1.4 5.9 3.9 8.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="flex-1 text-left">{selectedLanguageLabel}</span>
              <svg
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
                className={`h-4 w-4 transition-transform duration-200 ${
                  languageMenuOpen ? "rotate-180" : "rotate-0"
                } ${isDark ? "text-[#9DE16A]" : "text-[#4f8d3a]"}`}
              >
                <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div
              className={`absolute right-0 top-[calc(100%+0.55rem)] z-50 w-44 origin-top-right overflow-hidden rounded-2xl border p-1.5 shadow-[0_18px_45px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-200 ${
                languageMenuOpen
                  ? "translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none -translate-y-2 scale-95 opacity-0"
              } ${
                isDark
                  ? "border-[#34523c] bg-[#0c1510]/95"
                  : "border-[#d6e9cf] bg-white/95"
              }`}
              role="listbox"
            >
              {languageOptions.map((option) => {
                const label =
                  option.value === "en"
                    ? t("common.english")
                    : option.value === "tl"
                    ? t("common.tagalog")
                    : t("common.bisaya");
                const isSelected = language === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setLanguage(option.value as Language);
                      setLanguageMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      isSelected
                        ? isDark
                          ? "bg-[#9DE16A]/16 text-[#bdf29c]"
                          : "bg-[#9DE16A]/35 text-[#2f5f1f]"
                        : isDark
                        ? "text-zinc-300 hover:bg-white/7 hover:text-white"
                        : "text-[#1f2a44] hover:bg-[#eefbe7]"
                    }`}
                  >
                    <span>{label}</span>
                    {isSelected && (
                      <span className={isDark ? "text-[#9DE16A]" : "text-[#4f8d3a]"}>
                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                          <path d="m4.5 10.5 3.2 3.2 7.8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <ProfileMenu compact />
        </div>
      </div>
    </div>
  );
}