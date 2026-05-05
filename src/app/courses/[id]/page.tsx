"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, Calendar, ClipboardList, Download, ExternalLink } from "lucide-react";
import AssessmentGate from "@/components/assessment/AssessmentGate";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import { API_BASE_URL } from "@/lib/auth";
import {
  LessonRecord,
  mapLesson,
  readCachedLessons,
  writeCachedLessons,
} from "@/lib/lessonProgress";
import { useTheme } from "@/context/theme";

// ─── Offline Export ───────────────────────────────────────────────────────────
function exportLessonAsHTML(lesson: LessonRecord) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${lesson.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0a0a0a;
      color: #e4e4e7;
      min-height: 100vh;
      padding: 2rem 1rem;
    }
    .container { max-width: 780px; margin: 0 auto; }
    .badge {
      display: inline-block;
      background: #1f2e1f;
      color: #8CD559;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.3rem 0.9rem;
      border-radius: 999px;
      margin-bottom: 1.2rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h1 { font-size: 2rem; font-weight: 800; line-height: 1.25; margin-bottom: 1rem; }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      font-size: 0.85rem;
      color: #a1a1aa;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #27272a;
    }
    .meta span { display: flex; align-items: center; gap: 0.4rem; }
    .content { font-size: 1rem; line-height: 1.85; color: #d4d4d8; white-space: pre-wrap; }
    .quiz-cta {
      margin-top: 3rem;
      padding: 1.5rem;
      border: 1px solid #27272a;
      border-radius: 1rem;
      background: #111;
    }
    .quiz-cta h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; }
    .quiz-cta p { font-size: 0.875rem; color: #a1a1aa; margin-bottom: 1rem; }
    .quiz-cta .note {
      display: inline-block;
      font-size: 0.8rem;
      color: #52525b;
      font-style: italic;
    }
    .footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid #27272a;
      font-size: 0.75rem;
      color: #52525b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">${lesson.topic}</div>
    <h1>${lesson.title}</h1>
    <div class="meta">
      <span>📚 ${lesson.total_lessons} Lessons</span>
      <span>📝 ${lesson.total_quizzes} Quizzes</span>
      <span>📅 Saved on ${new Date().toLocaleDateString()}</span>
      ${typeof lesson.score === "number" ? `<span>⭐ Score: ${lesson.score}%</span>` : ""}
    </div>
    <div class="content">${lesson.content ?? "No content available."}</div>

    <div class="quiz-cta">
      <h3>📋 Test Your Knowledge</h3>
      <p>Ready to check what you learned? Go back online and take the quiz for this lesson.</p>
      <span class="note">Open the BarangAI app → Quizzes → ${lesson.topic}</span>
    </div>

    <div class="footer">
      Saved from BarangAI · Open this file in any browser to read offline
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${lesson.title.replace(/[^a-z0-9]/gi, "_")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params?.id);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [lesson, setLesson] = useState<LessonRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const baseUrl = API_BASE_URL.endsWith("/")
    ? API_BASE_URL
    : `${API_BASE_URL}/`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sidebar_collapsed");
      if (stored !== null) setCollapsed(stored === "true");
    } catch {}
  }, []);

  useEffect(() => {
    const fetchLesson = async () => {
      if (!Number.isFinite(courseId)) {
        setError("Invalid course.");
        setLoading(false);
        return;
      }

      let cachedLesson: LessonRecord | null = null;

      try {
        cachedLesson =
          readCachedLessons().find((item) => Number(item.id) === courseId) ?? null;

        if (cachedLesson) {
          setLesson(cachedLesson);
          setLoading(false);
          return;
        }

        const token = localStorage.getItem("access_token");

        const response = await fetch(`${baseUrl}lessons/${courseId}/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          const mappedLesson = mapLesson(data, courseId);

          const nextLessons = readCachedLessons();
          const mergedLessons =
            nextLessons.length === 0
              ? [mappedLesson]
              : nextLessons.some((item) => Number(item.id) === courseId)
              ? nextLessons.map((item) =>
                  Number(item.id) === courseId ? mappedLesson : item
                )
              : [...nextLessons, mappedLesson];

          writeCachedLessons(mergedLessons);
          setLesson(mappedLesson);
          return;
        }

        const listResponse = await fetch(`${baseUrl}lessons/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!listResponse.ok) throw new Error("Failed to load course.");

        const listData = await listResponse.json();
        const mappedLessons = Array.isArray(listData)
          ? listData.map((item, index) => mapLesson(item, index + 1))
          : [];

        const matchedLesson = mappedLessons.find(
          (item) => Number(item.id) === courseId
        );

        if (!matchedLesson) throw new Error("Course not found.");

        writeCachedLessons(mappedLessons);
        setLesson(matchedLesson);
      } catch (err) {
        console.error(err);
        if (!cachedLesson) setError("Unable to load this course right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [baseUrl, courseId]);

  const toggle = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem("sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const createdAt = useMemo(() => {
    if (!lesson?.created_at) return "";
    return new Date(lesson.created_at).toLocaleDateString();
  }, [lesson?.created_at]);

  const topicBackHref = useMemo(() => {
    const topic = (lesson?.topic || "").trim();
    if (!topic) return "/courses";
    return `/courses/topic/${encodeURIComponent(topic)}`;
  }, [lesson?.topic]);

  // Activities link — navigates to /activities with topic pre-selected
  const quizHref = useMemo(() => {
    const topic = (lesson?.topic || "").trim();
    const lessonTitle = (lesson?.title || "").trim();
    if (!topic && !lessonTitle) return "/activities";

    // Pass multiple selectors so QuizPage can resolve the exact quiz robustly.
    const params = new URLSearchParams();
    if (topic) params.set("topic", topic);
    params.set("lessonId", String(courseId));
    if (lessonTitle) params.set("lessonTitle", lessonTitle);
    return `/activities?${params.toString()}`;
  }, [lesson?.topic, lesson?.title, courseId]);

  const handleCompleteCourse = async () => {
    if (!lesson) return;

    try {
      const token = localStorage.getItem("access_token");

      const res = await fetch(`${baseUrl}lessons/${courseId}/complete/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error("Request failed");

      const data = await res.json();

      const updatedLesson = {
        ...lesson,
        completed: data.completed,
        progress: data.completed ? 100 : 0,
      };

      setLesson(updatedLesson);

      const cached = readCachedLessons();
      const updatedCache = cached.map((item) =>
        Number(item.id) === courseId ? updatedLesson : item
      );
      writeCachedLessons(updatedCache);
    } catch (err) {
      console.error("Backend update failed", err);
    }
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar collapsed={collapsed} onToggle={toggle} />

      <main
        className={`flex-1 p-8 lg:p-12 relative overflow-hidden ${
          isDark ? "text-white" : "text-black"
        }`}
      >
        <div className="relative z-10 flex h-full min-h-screen flex-col">
          <AssessmentGate
            title="Course content is locked until the pre-assessment is complete"
            description="Finish the dashboard pre-assessment first so the platform can place you at the right digital literacy level."
          >
            <TopBar searchValue={query} onSearch={setQuery} />

            {/* ── Top action bar ── */}
            <div className="mt-6 mb-6 flex items-center justify-between gap-4">
              <Link
                href={topicBackHref}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                  isDark
                    ? "bg-white/10 text-white"
                    : "bg-white/80 text-[#034440]"
                }`}
              >
                <ArrowLeft size={16} />
                Back to Lessons
              </Link>

              <div className="flex flex-wrap gap-3">
                {/* Open external resource */}
                {lesson?.url && (
                  <Link
                    href={lesson.url}
                    target="_blank"
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                      isDark
                        ? "bg-accentGreen text-black"
                        : "bg-brandGreen text-white"
                    }`}
                  >
                    <ExternalLink size={16} />
                    Open Resource
                  </Link>
                )}

                {/* Download lesson as offline HTML */}
                {lesson && (
                  <button
                    onClick={() => exportLessonAsHTML(lesson)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                      isDark
                        ? "bg-white/10 text-white hover:bg-white/20"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                  >
                    <Download size={16} />
                    Download Lesson
                  </button>
                )}

                {/* Mark complete / incomplete toggle */}
                {lesson && (
                  <button
                    onClick={handleCompleteCourse}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                      lesson.completed
                        ? isDark
                          ? "bg-red-400 text-black"
                          : "bg-red-600 text-white"
                        : isDark
                        ? "bg-green-400 text-black"
                        : "bg-green-600 text-white"
                    }`}
                  >
                    {lesson.completed ? "Mark Incomplete" : "Complete Course"}
                  </button>
                )}
              </div>
            </div>

            {/* ── States ── */}
            {loading ? (
              <div className="p-10 text-center font-bold text-brandGreen">
                Loading course...
              </div>
            ) : error ? (
              <div
                className={`rounded-3xl border p-8 ${
                  isDark
                    ? "border-white/10 bg-zinc-900/80"
                    : "border-gray-200 bg-white/90"
                }`}
              >
                <h1 className="text-2xl font-bold">Course unavailable</h1>
                <p className={`mt-3 ${isDark ? "text-zinc-300" : "text-gray-600"}`}>
                  {error}
                </p>
              </div>
            ) : lesson ? (
              <section
                className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border shadow-xl ${
                  isDark
                    ? "border-white/10 bg-zinc-950/90"
                    : "border-gray-200 bg-white/90"
                }`}
              >
                {/* ── Course header ── */}
                <div
                  className={`border-b px-8 py-7 ${
                    isDark ? "border-white/10" : "border-gray-200"
                  }`}
                >
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        isDark
                          ? "bg-zinc-800 text-zinc-200"
                          : "bg-brandGreen/10 text-brandGreen"
                      }`}
                    >
                      {lesson.topic}
                    </span>

                    <span
                      className={`inline-flex items-center gap-2 text-sm ${
                        isDark ? "text-zinc-400" : "text-gray-500"
                      }`}
                    >
                      <Calendar size={14} />
                      {createdAt}
                    </span>
                  </div>

                  <h1 className="max-w-4xl text-3xl font-bold leading-tight lg:text-4xl">
                    {lesson.title}
                  </h1>

                  <div
                    className={`mt-6 flex flex-wrap gap-6 text-sm ${
                      isDark ? "text-zinc-300" : "text-gray-600"
                    }`}
                  >
                    <div className="inline-flex items-center gap-3">
                      <BookOpen size={18} className="text-[#9DE16A]" />
                      <span>{lesson.total_lessons} Lessons</span>
                    </div>
                    <div>
                      <span className="font-semibold">{lesson.total_quizzes}</span> quizzes
                    </div>
                    <div>
                      <span className="font-semibold">{lesson.progress}%</span> progress
                    </div>
                    <div>
                      <span className="font-semibold">
                        {lesson.completed ? "Completed" : "In progress"}
                      </span>
                    </div>
                    {typeof lesson.score === "number" && (
                      <div>
                        <span className="font-semibold">{lesson.score}%</span> latest score
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Course content ── */}
                <div className="min-h-0 flex-1 overflow-y-auto px-8 py-8">
                  <div className="max-w-4xl">
                    <h2
                      className={`mb-4 text-lg font-semibold ${
                        isDark ? "text-zinc-100" : "text-[#034440]"
                      }`}
                    >
                      Course Content
                    </h2>

                    <div
                      className={`whitespace-pre-wrap text-base leading-8 ${
                        isDark ? "text-zinc-200" : "text-gray-700"
                      }`}
                    >
                      {lesson.content || "No content available for this course yet."}
                    </div>

                    {/* ── Quiz CTA at the bottom ── */}
                    <div
                      className={`mt-10 rounded-2xl border p-6 ${
                        isDark
                          ? "border-zinc-700 bg-zinc-800/50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <ClipboardList
                          size={20}
                          className={isDark ? "text-[#8CD559]" : "text-brandGreen"}
                        />
                        <h3 className="text-lg font-bold">Test Your Knowledge</h3>
                      </div>
                      <p
                        className={`text-sm mb-4 ${
                          isDark ? "text-zinc-400" : "text-gray-500"
                        }`}
                      >
                        Ready to check what you learned? Take the quiz for this lesson.
                      </p>
                      <Link
                        href={quizHref}
                        className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold ${
                          isDark
                            ? "bg-[#8CD559] text-black hover:bg-[#7bc04e]"
                            : "bg-brandGreen text-white hover:opacity-90"
                        }`}
                      >
                        <ClipboardList size={16} />
                        Take the Quiz
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}
          </AssessmentGate>
        </div>
      </main>
    </div>
  );
}