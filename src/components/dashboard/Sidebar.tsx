"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HiHome, HiChat, HiBookOpen, HiClipboardList, HiChartBar, HiCog, HiMenu } from "react-icons/hi";
import ProfileMenu from "@/components/ui/ProfileMenu"; // Make sure this is used if needed, or remove if unused
import { useTheme } from "@/context/theme";

type Props = {
  collapsed?: boolean;
  onToggle?: () => void;
};

export default function Sidebar({ collapsed = false, onToggle }: Props) {
  const pathname = usePathname() || "/";
  const isControlled = typeof onToggle === "function";
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(collapsed);
  
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // initialize internal state from localStorage when uncontrolled
  useEffect(() => {
    if (isControlled) return;
    try {
      const v = localStorage.getItem("sidebar_collapsed");
      if (v !== null) setInternalCollapsed(v === "true");
    } catch (err) {
      // ignore
    }
  }, [isControlled]);

  // keep internalCollapsed in sync when parent-controlled prop changes
  useEffect(() => {
    if (isControlled) return;
    setInternalCollapsed(collapsed);
  }, [collapsed, isControlled]);

  const items = [
    { label: "Dashboard", href: "/dashboard", icon: HiHome },
    { label: "Chatbot", href: "/chatbot", icon: HiChat },
    { label: "Courses", href: "/courses", icon: HiBookOpen },
    { label: "Activities", href: "/activities", icon: HiClipboardList },
    { label: "Statistics", href: "/statistics", icon: HiChartBar },
    { label: "Settings", href: "/settings", icon: HiCog },
  ];

  const effectiveCollapsed = isControlled ? collapsed : internalCollapsed;

  const handleToggle = () => {
    if (isControlled) {
      onToggle && onToggle();
      return;
    }
    setInternalCollapsed((s) => {
      const next = !s;
      try {
        localStorage.setItem("sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  return (
    <aside
      className={`hidden md:flex flex-col gap-6 transition-[width] duration-300 sticky top-4 ${
        effectiveCollapsed ? "w-20" : "w-64"
      } ml-4 h-[calc(100vh-2rem)] rounded-2xl backdrop-blur-xl border shadow-2xl p-4 ${
        isDark 
          ? "bg-[#034440]/20 border-white/15 shadow-black/20 text-white" 
          : "bg-white/80 border-gray-200 shadow-black/5 text-[#034440]"
      }`}
    >
      <div className={`flex items-center gap-3 px-2 pb-2 border-b ${isDark ? "border-white/10" : "border-gray-200"}`}>
        {/* hamburger in header (replaces logo) */}
        <button onClick={handleToggle} className={`p-1 ${isDark ? "text-white" : "text-[#034440]"}`}>
          <HiMenu className="w-6 h-6" />
        </button>
        {!effectiveCollapsed && (
          <Link href="/" className="text-lg font-bold">
            Barang<span className={isDark ? "text-accentGreen" : "text-brandGreen"}>AI</span>
          </Link>
        )}
      </div>

      <nav className="flex-1">
        <ul className="flex flex-col gap-2 mt-6">
          {items.map((it) => {
            const active = pathname === it.href || pathname.startsWith(it.href + "/");
            return (
              <li key={it.label}>
                <Link
                  href={it.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-200 ${
                    effectiveCollapsed ? "justify-center" : ""
                  } ${
                    active
                      ? isDark
                        ? "bg-accentGreen/25 border border-accentGreen/30"
                        : "bg-brandGreen/10 border border-brandGreen/20"
                      : "bg-transparent border border-transparent"
                  } ${isDark ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
                >
                  {/* icon: when collapsed and active, icon gets accent color; when expanded, icon/text turn white and row gets accent background */}
                  <it.icon
                    className={`w-5 h-5 transition-transform duration-150 ${
                      effectiveCollapsed
                        ? active
                          ? isDark ? "text-accentGreen scale-110" : "text-brandGreen scale-110"
                          : isDark ? "text-[#AFAFAF]" : "text-gray-400"
                        : active
                          ? isDark ? "text-white" : "text-brandGreen"
                          : isDark ? "text-[#AFAFAF]" : "text-gray-400"
                    }`}
                  />
                  {!effectiveCollapsed && (
                    <span className={`text-sm ${active ? (isDark ? "text-white" : "text-[#034440] font-semibold") : (isDark ? "text-[#AFAFAF]" : "text-gray-500")}`}>
                      {it.label}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}