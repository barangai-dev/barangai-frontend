"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { BookOpen, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import TopBar from "@/components/dashboard/TopBar";
import { API_BASE_URL } from "@/lib/auth";
import { LessonRecord, mapLesson, readCachedLessons, writeCachedLessons } from "@/lib/lessonProgress";
import { useTheme } from "@/context/theme";
import { useI18n } from "@/context/i18n";

function getTopicColors(topic?: string | null) {
  const t = (topic || "").toLowerCase();

  // Word / Documents
  if (t.includes("word") || t.includes("document")) {
    return {
      banner: "from-blue-500/90 via-sky-400/90 to-blue-600/90",
      pill: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    };
  }

  // Excel / Spreadsheet
  if (t.includes("excel") || t.includes("sheet") || t.includes("spreadsheet")) {
    return {
      banner: "from-emerald-500/90 via-green-400/90 to-emerald-600/90",
      pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    };
  }

  // Internet / Browsing
  if (t.includes("internet") || t.includes("browser") || t.includes("online")) {
    return {
      banner: "from-amber-400/90 via-yellow-300/90 to-amber-500/90",
      pill: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    };
  }

  // Email / Communication
  if (t.includes("email") || t.includes("communication") || t.includes("messaging")) {
    return {
      banner: "from-violet-500/90 via-indigo-400/90 to-violet-600/90",
      pill: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
    };
  }

  // Default: soft teal
  return {
    banner: "from-teal-500/90 via-cyan-400/90 to-teal-600/90",
    pill: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300",
  };
}

export default function CoursesList({ apiUrl, searchQuery }: { apiUrl?: string; searchQuery?: string }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"enrolled" | "completed">("enrolled");
  const [query, setQuery] = React.useState("");
  const [openTopics, setOpenTopics] = useState<Record<string, boolean>>({});

  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
  const fetchEndpoint = apiUrl || `${baseUrl}lessons/`;

  useEffect(() => {
    const fetchLessons = async () => {
      const cachedLessons = readCachedLessons();
      if (cachedLessons.length > 0) {
        setLessons(cachedLessons);
        setLoading(false);
      }

      try {
        const token = localStorage.getItem("access_token");
        const response = await fetch(fetchEndpoint, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) throw new Error("Failed to load");

        const data = await response.json();

        const lessonsArray = Array.isArray(data)
          ? data
          : data.results || [];

        const mappedLessons = lessonsArray.map((lesson: any, index: number) => mapLesson(lesson, index + 1));

        writeCachedLessons(mappedLessons);
        setLessons(mappedLessons);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, [fetchEndpoint]);

  const filtered = useMemo(() => {
    const q = (query || searchQuery || "").trim().toLowerCase();
    return lessons.filter((l) => {
      if (!q) return true;
      return (l.title || "").toLowerCase().includes(q) || (l.topic || "").toLowerCase().includes(q);
    });
  }, [lessons, query, searchQuery]);

  const groupedByTopic = useMemo(() => {
    const grouped = new Map<string, LessonRecord[]>();
    for (const lesson of filtered) {
      const topic = (lesson.topic || "General").trim() || "General";
      const existing = grouped.get(topic) ?? [];
      existing.push(lesson);
      grouped.set(topic, existing);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const topicGroups = useMemo(
    () =>
      groupedByTopic.map(([topic, topicLessons]) => {
        const completedCount = topicLessons.filter((lesson) => lesson.completed).length;
        const isTopicCompleted = topicLessons.length > 0 && completedCount === topicLessons.length;
        return { topic, topicLessons, completedCount, isTopicCompleted };
      }),
    [groupedByTopic]
  );

  const enrolledTopicGroups = useMemo(
    () => topicGroups.filter((group) => !group.isTopicCompleted),
    [topicGroups]
  );
  const completedTopicGroups = useMemo(
    () => topicGroups.filter((group) => group.isTopicCompleted),
    [topicGroups]
  );
  const visibleTopicGroups = activeTab === "completed" ? completedTopicGroups : enrolledTopicGroups;

  useEffect(() => {
    setOpenTopics((current) => {
      const next: Record<string, boolean> = {};
      for (const group of visibleTopicGroups) {
        next[group.topic] = current[group.topic] ?? true;
      }
      return next;
    });
  }, [visibleTopicGroups]);

  const toggleTopic = (topic: string) => {
    setOpenTopics((current) => ({ ...current, [topic]: !current[topic] }));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full p-10 text-brandGreen font-medium">
      {t("coursesPage.loadingCourses")}
    </div>
  );

  return (
    <main
      className={`flex-1 p-6 md:p-8 lg:p-10 relative overflow-hidden ${
        isDark ? "text-zinc-100" : "text-zinc-900"
      }`}
    >
      <div className="relative z-10 max-w-7xl mx-auto">
        <TopBar searchValue={query} onSearch={setQuery} />
        
        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">{t("coursesPage.yourCourses")}</h2>
            <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {t("coursesPage.continueLearningWhereLeft")}
            </p>
          </div>
          
          <div className={`inline-flex p-1 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
            <button 
              onClick={() => setActiveTab('enrolled')} 
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === 'enrolled' 
                  ? (isDark ? 'bg-zinc-800 text-white shadow-sm' : 'bg-white text-brandGreen shadow-sm') 
                  : `text-zinc-500 hover:text-zinc-700 ${isDark ? 'hover:text-zinc-300' : ''}`
              }`}
            >
              {t("coursesPage.enrolled")} ({enrolledTopicGroups.length})
            </button>
            <button 
              onClick={() => setActiveTab('completed')} 
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === 'completed' 
                  ? (isDark ? 'bg-zinc-800 text-white shadow-sm' : 'bg-white text-brandGreen shadow-sm') 
                  : `text-zinc-500 hover:text-zinc-700 ${isDark ? 'hover:text-zinc-300' : ''}`
              }`}
            >
              {t("coursesPage.completed")} ({completedTopicGroups.length})
            </button>
          </div>
        </div>

        {/* Topic List */}
        {visibleTopicGroups.length === 0 ? (
          <div className={`p-12 text-center rounded-xl border border-dashed ${isDark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-500'}`}>
            {activeTab === "completed"
              ? t("coursesPage.noCompletedCourses")
              : t("coursesPage.noCoursesFound")}
          </div>
        ) : (
          <div className="space-y-4">
            {visibleTopicGroups.map(({ topic, topicLessons, completedCount }) => {
              const isOpen = openTopics[topic];
              const topicProgress = topicLessons.length
                ? Math.round(topicLessons.reduce((sum, lesson) => sum + lesson.progress, 0) / topicLessons.length)
                : 0;
              const completedInTopic = completedCount;

              return (
                <section
                  key={topic}
                  className={`overflow-hidden rounded-2xl border ${isDark ? "border-zinc-800 bg-zinc-900/40" : "border-zinc-200 bg-white"}`}
                >
                  <div className={`h-1.5 w-full bg-gradient-to-r ${getTopicColors(topic).banner}`} />
                  <button
                    type="button"
                    onClick={() => toggleTopic(topic)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left ${isDark ? "hover:bg-zinc-800/50" : "hover:bg-zinc-50"} rounded-2xl`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg ${isDark ? "bg-zinc-800 text-accentGreen" : "bg-green-50 text-brandGreen"}`}>
                        <BookOpen size={16} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm md:text-base font-semibold truncate">{topic}</h3>
                        <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                          {topicLessons.length} {topicLessons.length > 1 ? t("coursesPage.lessons") : t("coursesPage.lesson")} • {completedInTopic}/{topicLessons.length} {t("coursesPage.completedLower")} • {topicProgress}% {t("coursesPage.progress")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-20">
                        <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? "bg-zinc-800" : "bg-zinc-200"}`}>
                          <div
                            className={`h-full rounded-full ${isDark ? "bg-accentGreen" : "bg-brandGreen"}`}
                            style={{ width: `${topicProgress}%` }}
                          />
                        </div>
                      </div>
                      <span className={`text-[11px] font-semibold ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                        {topicProgress}%
                      </span>
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className={`border-t px-3 py-2 ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {topicLessons.map((lesson) => (
                          <article
                            key={lesson.id}
                            className={`overflow-hidden rounded-xl border ${isDark ? "border-zinc-800 bg-zinc-950/50" : "border-zinc-200 bg-white"} shadow-sm`}
                          >
                            <div className={`h-1.5 w-full bg-gradient-to-r ${getTopicColors(topic).banner}`} />

                            <div className="p-3">
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-sm font-semibold leading-snug">{lesson.title}</p>
                                <div className={`mt-1.5 flex flex-wrap items-center gap-2 text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                                  <span
                                    className={`rounded-md px-1.5 py-0.5 font-medium ${
                                      lesson.completed
                                        ? isDark
                                          ? "bg-accentGreen/20 text-accentGreen"
                                          : "bg-green-100 text-green-700"
                                        : lesson.progress > 0
                                          ? isDark
                                            ? "bg-zinc-800 text-zinc-300"
                                            : "bg-amber-100 text-amber-700"
                                          : isDark
                                            ? "bg-zinc-800 text-zinc-400"
                                            : "bg-zinc-100 text-zinc-600"
                                    }`}
                                  >
                                    {lesson.completed ? t("coursesPage.completed") : lesson.progress > 0 ? t("coursesPage.inProgress") : t("coursesPage.notStarted")}
                                  </span>
                                  <span>{lesson.progress}%</span>
                                  {typeof lesson.score === "number" && <span>{t("coursesPage.score")} {lesson.score}%</span>}
                                </div>
                              </div>

                              <div className="mt-3 space-y-2">
                                <div className={`h-1.5 w-full overflow-hidden rounded-full ${isDark ? "bg-zinc-800" : "bg-zinc-100"}`}>
                                  <div
                                    className={`h-full rounded-full ${isDark ? "bg-accentGreen" : "bg-brandGreen"}`}
                                    style={{ width: `${lesson.progress}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className={`inline-flex items-center gap-1 text-[11px] ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                                    <Calendar size={11} />
                                    {new Date(lesson.created_at).toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </span>
                                  <Link
                                    href={`/courses/${lesson.id}`}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                      isDark
                                        ? "bg-accentGreen text-zinc-900 hover:bg-accentGreen/90"
                                        : "bg-brandGreen text-white hover:bg-brandGreen/90"
                                    }`}
                                  >
                                    {t("coursesPage.openLesson")}
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}