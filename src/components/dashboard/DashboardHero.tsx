"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/auth";
import { LessonRecord, mapLesson, readCachedLessons, writeCachedLessons } from "@/lib/lessonProgress";
import { fetchGeneralStatisticsReport, type GeneralStatisticsReport } from "@/lib/statistics";
import { BookOpen, ArrowUpRight, Brain, TrendingUp, ArrowRight } from "lucide-react";
import { useTheme } from "@/context/theme";
import { useI18n } from "@/context/i18n";

export default function DashboardHero() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";

  const [entered, setEntered] = useState(false);
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [reportData, setReportData] = useState<GeneralStatisticsReport | null>(null);
  const [userName, setUserName] = useState("User");

  // Animation trigger on mount
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Get username from localStorage
  useEffect(() => {
    const storedEmail = localStorage.getItem("user_email");
    const firstName = localStorage.getItem("first_name");
    
    if (!storedEmail) return;
    const emailName = storedEmail.split("@")[0];
    const trimmedFirst = (firstName ?? "").trim();
    setUserName(trimmedFirst || emailName);
  }, []);

  // Fetch logic for Lessons (keeps the "You're enrolled in X courses" count accurate)
  useEffect(() => {
    const fetchLessons = async () => {
      const cachedLessons = readCachedLessons();
      if (cachedLessons.length > 0) {
        setLessons(cachedLessons);
      }

      try {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}lessons/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) throw new Error("Failed to fetch lessons");

        const data = await response.json();
        const lessonItems = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        
        const mappedLessons = lessonItems.map((lesson: any, index: number) => 
          mapLesson(lesson, index + 1)
        );

        writeCachedLessons(mappedLessons);
        setLessons(mappedLessons);
      } catch (err) {
        console.error("DashboardHero Fetch Error:", err);
      }
    };

    fetchLessons();
  }, []);

  // Fetch logic for High-Level Statistics
  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchGeneralStatisticsReport();
        setReportData(data);
      } catch (err) {
        console.error("Failed to load dashboard statistics", err);
      }
    };
    loadStats();
  }, []);

  // Extract Stats Safely
  const progressPercent = reportData?.lesson_progress.completion_rate_percent.toFixed(1) || "0.0";
  const avgScore = reportData?.quiz_progress.average_score.toFixed(1) || "0.0";
  const scoreGrowth = reportData?.quiz_progress.score_growth || 0;
  const growthPrefix = scoreGrowth >= 0 ? "+" : "";

  return (
    <section
      data-no-i18n="true"
      className={`relative w-full overflow-hidden rounded-[2rem] p-6 transition-all duration-700 ease-out border shadow-xl ${
        entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${
        isDark 
          ? "bg-[#1A322D]/80 border-white/10 backdrop-blur-xl" 
          : "bg-white/60 border-[#1A322D]/10 backdrop-blur-xl"
      }`}
    >
      {/* GLASSY MESH GRADIENTS */}
      <div className={`absolute top-[-50%] right-[-10%] w-64 h-64 rounded-full blur-[80px] pointer-events-none ${isDark ? "bg-[#B4ED7C]/15" : "bg-[#9DE16A]/20"}`} />
      <div className={`absolute bottom-[-50%] left-[-10%] w-64 h-64 rounded-full blur-[80px] pointer-events-none ${isDark ? "bg-emerald-500/10" : "bg-emerald-400/20"}`} />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        
        {/* LEFT: TEXT CONTENT */}
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? "text-[#B4ED7C]" : "text-[#5A9B29]"}`}>
            {t("dashboardHero.welcomeBack")}, {userName}
          </p>
          <h2 className={`text-3xl font-black leading-tight ${isDark ? "text-white" : "text-[#034440]"}`}>
            {t("dashboardHero.enrolledIn")} <br />
            <span className={isDark ? "text-white/90" : "text-[#034440]/80"}>{lessons.length} {t("dashboardHero.courses")}</span>
          </h2>
          <Link
            href="/courses"
            className={`group mt-5 inline-flex items-center gap-2 text-xs font-black px-5 py-2.5 rounded-xl transition-all duration-300 active:scale-95 shadow-lg ${
              isDark 
                ? "bg-[#B4ED7C] hover:bg-white text-black shadow-[#B4ED7C]/20" 
                : "bg-[#5A9B29] hover:bg-[#034440] text-white shadow-[#5A9B29]/20"
            }`}
          >
            {t("dashboardHero.continueLearning")}
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>

        {/* RIGHT: COMPACT STATS CARDS */}
        <div className="flex flex-col gap-3 w-full md:w-auto mt-2 md:mt-0">
          {/* Top Info Bar */}
          <div className="flex items-center justify-between md:justify-end px-1">
            <span className={`text-[10px] font-bold uppercase tracking-widest md:hidden ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
              {t("dashboardHero.yourSnapshot")}
            </span>
            <Link 
              href="/statistics"
              className={`text-xs font-bold flex items-center gap-1 transition-colors hover:underline ${isDark ? "text-[#B4ED7C]" : "text-[#5A9B29]"}`}
            >
              {t("dashboardHero.viewStatistics")} <ArrowRight size={14} />
            </Link>
          </div>

          {/* Cards Wrapper */}
          <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            
            {/* STAT 1: OVERALL PROGRESS */}
            <div className={`w-36 h-32 backdrop-blur-md rounded-xl p-4 flex flex-col justify-between border shrink-0 transition-transform duration-300 hover:-translate-y-1 ${isDark ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-white/80 border-[#1A322D]/10 hover:bg-white shadow-sm"}`}>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isDark ? "bg-white/10 text-[#B4ED7C]" : "bg-[#5A9B29]/10 text-[#5A9B29]"}`}>
                <BookOpen size={16} />
              </div>
              <div>
                <h3 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-800"}`}>
                  {reportData ? `${progressPercent}%` : "-"}
                </h3>
                <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                  {t("dashboardHero.progress")}
                </p>
              </div>
            </div>

            {/* STAT 2: CURRENT PROFICIENCY */}
            <div className={`w-36 h-32 backdrop-blur-md rounded-xl p-4 flex flex-col justify-between border shrink-0 transition-transform duration-300 hover:-translate-y-1 ${isDark ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-white/80 border-[#1A322D]/10 hover:bg-white shadow-sm"}`}>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isDark ? "bg-white/10 text-[#B4ED7C]" : "bg-[#5A9B29]/10 text-[#5A9B29]"}`}>
                <Brain size={18} />
              </div>
              <div>
                <h3 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-800"}`}>
                  {reportData ? `${avgScore}%` : "-"}
                </h3>
                <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                  {t("dashboardHero.digitalProficiency")}
                </p>
              </div>
            </div>

            {/* STAT 3: SCORE GROWTH */}
            <div className={`w-36 h-32 backdrop-blur-md rounded-xl p-4 flex flex-col justify-between border shrink-0 transition-transform duration-300 hover:-translate-y-1 ${isDark ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-white/80 border-[#1A322D]/10 hover:bg-white shadow-sm"}`}>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isDark ? "bg-white/10 text-[#B4ED7C]" : "bg-[#5A9B29]/10 text-[#5A9B29]"}`}>
                <TrendingUp size={18} />
              </div>
              <div>
                <h3 className={`text-2xl font-black ${
                  !reportData 
                    ? (isDark ? "text-white" : "text-slate-800")
                    : scoreGrowth >= 0 
                      ? (isDark ? "text-[#B4ED7C]" : "text-[#5A9B29]") 
                      : "text-rose-500"
                }`}>
                  {reportData ? `${growthPrefix}${scoreGrowth}%` : "-"}
                </h3>
                <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                  {t("dashboardHero.scoreGrowth")}
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}