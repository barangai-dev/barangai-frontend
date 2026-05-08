"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Calendar } from "lucide-react";
import TopBar from "@/components/dashboard/TopBar";
import { API_BASE_URL } from "@/lib/auth";
import { LessonRecord, mapLesson, readCachedLessons, writeCachedLessons } from "@/lib/lessonProgress";
import { useTheme } from "@/context/theme";
import { useI18n } from "@/context/i18n";

function getTopicColors(topic?: string | null) {
  const t = (topic || "").toLowerCase();
  if (t.includes("word") || t.includes("document")) return { banner: "from-blue-500/90 via-sky-400/90 to-blue-600/90" };
  if (t.includes("excel") || t.includes("sheet") || t.includes("spreadsheet")) return { banner: "from-emerald-500/90 via-green-400/90 to-emerald-600/90" };
  if (t.includes("internet") || t.includes("browser") || t.includes("online")) return { banner: "from-amber-400/90 via-yellow-300/90 to-amber-500/90" };
  if (t.includes("email") || t.includes("communication") || t.includes("messaging")) return { banner: "from-violet-500/90 via-indigo-400/90 to-violet-600/90" };
  return { banner: "from-teal-500/90 via-cyan-400/90 to-teal-600/90" };
}

export default function TopicLessonsClient({ topic }: { topic: string }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<LessonRecord[]>([]);

  const baseUrl = API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`;
  const LESSONS_FETCHED_FLAG_KEY = "lessons_fetched_once";

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        setLoading(true);
        const cached = readCachedLessons();
        if (cached.length > 0) {
          setLessons(cached);
          setLoading(false);
          return;
        }

        const token = localStorage.getItem("access_token");
        const response = await fetch(`${baseUrl}lessons/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) throw new Error("Failed to load lessons");

        const data = await response.json();
        const items = Array.isArray(data) ? data : data.results || [];
        const mapped = items.map((item: any, idx: number) => mapLesson(item, idx + 1));
        writeCachedLessons(mapped);
        localStorage.setItem(LESSONS_FETCHED_FLAG_KEY, "true");
        setLessons(mapped);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const hasFetchedOnce = localStorage.getItem(LESSONS_FETCHED_FLAG_KEY) === "true";
    if (hasFetchedOnce && readCachedLessons().length > 0) {
      setLessons(readCachedLessons());
      setLoading(false);
      return;
    }

    fetchLessons();
  }, [baseUrl]);

  const topicLessons = useMemo(() => {
    const normalizedTopic = topic.trim().toLowerCase();
    const search = query.trim().toLowerCase();
    return lessons.filter((lesson) => {
      if ((lesson.topic || "").trim().toLowerCase() !== normalizedTopic) return false;
      if (!search) return true;
      return (lesson.title || "").toLowerCase().includes(search);
    });
  }, [lessons, topic, query]);

  const progress = topicLessons.length
    ? Math.round(topicLessons.reduce((sum, lesson) => sum + lesson.progress, 0) / topicLessons.length)
    : 0;
  const completedCount = topicLessons.filter((lesson) => lesson.completed).length;

  return (
    <main className={`flex-1 p-6 md:p-8 lg:p-10 ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
      <div className="mx-auto max-w-7xl">
        <TopBar searchValue={query} onSearch={setQuery} />

        <div className="mt-6">
          <Link
            href="/courses"
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${isDark ? "bg-zinc-800 text-zinc-100" : "bg-zinc-100 text-zinc-700"}`}
          >
            <ArrowLeft size={14} />
            {t("coursesPage.backToCourses")}
          </Link>
        </div>

        <section className={`mt-4 overflow-hidden rounded-2xl border ${isDark ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-200 bg-white"}`}>
          <div className={`h-1.5 w-full bg-gradient-to-r ${getTopicColors(topic).banner}`} />
          <div className="p-4">
            <h1 className="text-xl font-bold">{topic}</h1>
            <p className={`mt-1 text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              {topicLessons.length} {t("coursesPage.lessons")} • {completedCount}/{topicLessons.length} {t("coursesPage.completedLower")} • {progress}% {t("coursesPage.averageProgress")}
            </p>
          </div>
        </section>

        {loading ? (
          <div className="mt-6 text-sm">{t("coursesPage.loadingLessons")}</div>
        ) : topicLessons.length === 0 ? (
          <div className={`mt-6 rounded-xl border border-dashed p-10 text-center text-sm ${isDark ? "border-zinc-800 text-zinc-400" : "border-zinc-200 text-zinc-500"}`}>
            {t("coursesPage.noLessonsFound")}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {topicLessons.map((lesson) => (
              <article
                key={lesson.id}
                className={`overflow-hidden rounded-xl border shadow-sm ${isDark ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-200 bg-white"}`}
              >
                <div className={`h-1.5 w-full bg-gradient-to-r ${getTopicColors(topic).banner}`} />
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold">{lesson.title}</p>
                  <div className={`mt-2 flex flex-wrap items-center gap-2 text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    <span>{lesson.completed ? t("coursesPage.completed") : lesson.progress > 0 ? t("coursesPage.inProgress") : t("coursesPage.notStarted")}</span>
                    <span>•</span>
                    <span>{lesson.progress}%</span>
                    {typeof lesson.score === "number" && (
                      <>
                        <span>•</span>
                        <span>{t("coursesPage.score")} {lesson.score}%</span>
                      </>
                    )}
                  </div>
                  <div className={`mt-3 h-1.5 w-full overflow-hidden rounded-full ${isDark ? "bg-zinc-800" : "bg-zinc-100"}`}>
                    <div className={`h-full rounded-full ${isDark ? "bg-accentGreen" : "bg-brandGreen"}`} style={{ width: `${lesson.progress}%` }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
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
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${isDark ? "bg-accentGreen text-zinc-900 hover:bg-accentGreen/90" : "bg-brandGreen text-white hover:bg-brandGreen/90"}`}
                    >
                      {t("coursesPage.openLesson")}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
