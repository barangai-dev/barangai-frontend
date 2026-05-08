"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Loader2,
  XCircle,
  RotateCcw,
  CheckCircle,
} from "lucide-react";
import TopBar from "@/components/dashboard/TopBar";
import Stepper, { Step } from "@/components/quizzes/Stepper";
import { API_BASE_URL } from "@/lib/auth";
import chatBgLight from "@/assets/img/chatBotBg-white.png";
import chatBgDark from "@/assets/img/chatBotBg-black.png";
import { useTheme } from "@/context/theme";
import { useI18n } from "@/context/i18n";
import { translateDynamicText } from "@/lib/autoTranslate";

interface Question {
  id: number;
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
}

interface Assessment {
  id: number;
  lessonId?: number;
  title: string;
  topic: string;
  questions: Question[];
  total_questions: number;
  created_at: string;
  total_attempts: number;
  time_limit?: number | null;
  status: string;
  completed: boolean;
  score?: number | null;
}

interface QuizResult {
  total_questions: number;
  answered_count: number;
  correct_count?: number | null;
  score_percent?: number | null;
  correct_answers?: Record<number | string, string>;
}

type ChoiceKey = "A" | "B" | "C" | "D";
type TabType = "ALL" | "PENDING" | "COMPLETED";
type ActivityTab = "QUIZZES" | "TASKS";

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function mapAssessment(item: any, idx: number): Assessment {
  const questions = Array.isArray(item?.questions) ? item.questions : [];
  const broadCategory = item?.lesson?.category?.name ?? item?.title ?? "General";
  const specificQuizName = item?.lesson?.title ?? item?.topic ?? `Assessment ${idx + 1}`;
  const quizId = toNumber(item?.id) ?? idx;
  const lessonId = toNumber(item?.lesson?.id) ?? toNumber(item?.lesson_id) ?? undefined;

  return {
    id: quizId,
    lessonId,
    title: specificQuizName,
    topic: broadCategory,
    questions,
    total_questions: questions.length || item?.total_questions || 0,
    created_at: item?.created_at ?? item?.updated_at ?? new Date().toISOString(),
    total_attempts: item?.total_attempts ?? 0,
    time_limit: item?.time_limit ?? null,
    status: item?.status ?? "Published",
    completed: item?.completed || item?.progress?.completed || false,
    score: item?.score ?? item?.progress?.score ?? null,
  };
}

function getChoices(question: Question) {
  return [
    { key: "A" as const, text: question.choice_a },
    { key: "B" as const, text: question.choice_b },
    { key: "C" as const, text: question.choice_c },
    { key: "D" as const, text: question.choice_d },
  ].filter((choice) => choice.text);
}

type QuizPageProps = {
  activityTab?: ActivityTab;
  onSwitchTab?: (tab: ActivityTab) => void;
};

export default function QuizPage({ activityTab = "QUIZZES", onSwitchTab }: QuizPageProps) {
  const { theme } = useTheme();
  const { language, t } = useI18n();
  const isDark = theme === "dark";
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingQuizId, setLoadingQuizId] = useState<number | null>(null);
  const [quizError, setQuizError] = useState("");

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Assessment | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("ALL");

  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<number, ChoiceKey>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [translatedQuizText, setTranslatedQuizText] = useState<Record<string, string>>({});
  const [showIncompleteSubmitModal, setShowIncompleteSubmitModal] = useState(false);

  const baseUrl = API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`;

  // Prevents auto-open from firing more than once
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    const topicParam = searchParams.get("topic");
    const lessonIdParam = searchParams.get("lessonId");
    const lessonTitleParam = searchParams.get("lessonTitle");

    const fetchAndAutoOpen = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("access_token");

        const res = await fetch(`${baseUrl}quizzes/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load");

        const data = await res.json();
        const items = Array.isArray(data) ? data : data.results || [];
        const mapped: Assessment[] = items.map((item: any, idx: number) =>
          mapAssessment(item, idx)
        );
        setAssessments(mapped);

        // --- INTELLIGENT AUTO-OPEN LOGIC ---
        if (!autoOpenedRef.current) {
          autoOpenedRef.current = true;

          // SCENARIO 1: From Course Page (Both Topic and LessonId exist)
          if (topicParam && lessonIdParam) {
            const decodedTopic = decodeURIComponent(topicParam);
            const normalizedTopic = normalizeText(decodedTopic);
            const normalizedLessonTitle = normalizeText(
              lessonTitleParam ? decodeURIComponent(lessonTitleParam) : ""
            );
            const targetId = toNumber(lessonIdParam);

            const matchesTopic = (a: Assessment) =>
              normalizeText(a.topic) === normalizedTopic;
            const matchesTitle = (a: Assessment) =>
              normalizedLessonTitle.length > 0 &&
              normalizeText(a.title) === normalizedLessonTitle;

            const matched =
              (targetId !== null
                ? mapped.find((a) => a.lessonId === targetId && matchesTopic(a) && matchesTitle(a))
                : undefined) ??
              (targetId !== null
                ? mapped.find((a) => a.lessonId === targetId && matchesTitle(a))
                : undefined) ??
              (targetId !== null
                ? mapped.find((a) => a.lessonId === targetId && matchesTopic(a))
                : undefined) ??
              (targetId !== null ? mapped.find((a) => a.lessonId === targetId) : undefined) ??
              mapped.find((a) => matchesTopic(a) && matchesTitle(a)) ??
              mapped.find((a) => matchesTitle(a)) ??
              mapped.find((a) => matchesTopic(a));

            if (matched) {
              setSelectedTopic(matched.topic);
              setLoadingQuizId(matched.id);

              try {
                const qRes = await fetch(`${baseUrl}quizzes/${matched.id}/`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                const qData = await qRes.json();
                setSelectedQuiz(mapAssessment(qData, matched.id));
              } catch {
                setSelectedQuiz(matched);
              } finally {
                setLoadingQuizId(null);
              }
            }
          } 
          // SCENARIO 2: From Dashboard Page (Only Topic exists)
          else if (topicParam) {
            const decodedTopic = decodeURIComponent(topicParam);
            const normalizedTopic = normalizeText(decodedTopic);
            const topicExists = mapped.some(
              (a) => normalizeText(a.topic) === normalizedTopic
            );

            if (topicExists) {
              // Open the sidebar using the exact topic label from fetched quizzes.
              const matchedTopicLabel =
                mapped.find((a) => normalizeText(a.topic) === normalizedTopic)?.topic ??
                decodedTopic;
              setSelectedTopic(matchedTopicLabel);
            }
          }
        }
      } catch (err) {
        setQuizError("Failed to load quizzes.");
      } finally {
        setLoading(false);
      }
    };

    fetchAndAutoOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl]);

  const filteredAssessments = useMemo(() => {
    return assessments.filter((a) => {
      if (activeTab === "COMPLETED") return a.completed;
      if (activeTab === "PENDING") return !a.completed;
      return true;
    });
  }, [assessments, activeTab]);

  const topicGroups = useMemo(() => {
    const groups = new Map<string, Assessment[]>();
    filteredAssessments.forEach((a) => {
      const t = a.topic || "General";
      if (!groups.has(t)) groups.set(t, []);
      groups.get(t)?.push(a);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredAssessments]);

  const resetQuiz = () => {
    setCurrentStep(1);
    setAnswers({});
    setResult(null);
    setQuizError("");
  };

  useEffect(() => {
    let cancelled = false;

    if (language === "en") {
      setTranslatedQuizText({});
      return;
    }

    const values = new Set<string>();
    assessments.forEach((assessment) => {
      values.add(assessment.title);
      values.add(assessment.topic);
      assessment.questions.forEach((question) => {
        values.add(question.question_text);
        values.add(question.choice_a);
        values.add(question.choice_b);
        values.add(question.choice_c);
        values.add(question.choice_d);
      });
    });

    selectedQuiz?.questions.forEach((question) => {
      values.add(question.question_text);
      values.add(question.choice_a);
      values.add(question.choice_b);
      values.add(question.choice_c);
      values.add(question.choice_d);
    });

    const texts = Array.from(values).filter((value) => value?.trim());
    if (texts.length === 0) {
      setTranslatedQuizText({});
      return;
    }

    Promise.all(
      texts.map(async (text) => [text, await translateDynamicText(text, language)] as const)
    )
      .then((entries) => {
        if (!cancelled) setTranslatedQuizText(Object.fromEntries(entries));
      })
      .catch(() => {
        if (!cancelled) setTranslatedQuizText({});
      });

    return () => {
      cancelled = true;
    };
  }, [language, assessments, selectedQuiz]);

  const displayQuizText = (value?: string | null) => {
    if (!value) return "";
    return translatedQuizText[value] ?? value;
  };

  const handlePickAnotherQuiz = () => {
    setSelectedQuiz(null);
    resetQuiz();
  };

  const openQuiz = async (assessment: Assessment) => {
    setLoadingQuizId(assessment.id);
    resetQuiz();
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${baseUrl}quizzes/${assessment.id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSelectedQuiz(mapAssessment(data, assessment.id));
    } catch {
      setSelectedQuiz(assessment);
    } finally {
      setLoadingQuizId(null);
    }
  };

  const submitQuizRequest = async (skipIncompleteCheck = false) => {
    if (!selectedQuiz) return false;

    const unansweredCount = selectedQuiz.total_questions - answeredCount;
    if (!skipIncompleteCheck && unansweredCount > 0) {
      setShowIncompleteSubmitModal(true);
      return false;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${baseUrl}quizzes/${selectedQuiz.id}/submit/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();

      setResult({
        total_questions: data.total_count || selectedQuiz.total_questions,
        answered_count: Object.keys(answers).length,
        correct_count: data.correct_count,
        score_percent: data.score,
        correct_answers: data.correct_answers,
      });

      setAssessments((prev) =>
        prev.map((a) =>
          a.id === selectedQuiz.id ? { ...a, completed: true, score: data.score } : a
        )
      );
      return true;
    } catch {
      setQuizError("Submission failed. Scores may not be saved.");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const submitQuiz = () => submitQuizRequest(false);
  const submitIncompleteQuiz = async () => {
    setShowIncompleteSubmitModal(false);
    await submitQuizRequest(true);
  };

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = Math.max((selectedQuiz?.total_questions || 0) - answeredCount, 0);
  const unansweredDescription = t("quizzesPage.unansweredDescription")
    .replace("{count}", String(unansweredCount))
    .replace("{plural}", unansweredCount === 1 ? "" : "s");

  return (
    <div className="h-screen overflow-hidden">
      <main
        className={`relative flex h-full flex-col p-4 lg:p-5 ${
          isDark ? "text-zinc-100" : "text-zinc-900"
        }`}
      >
        <div className="absolute inset-0 z-0">
          <Image
            src={isDark ? chatBgDark : chatBgLight}
            alt="background"
            fill
            className="object-cover opacity-60"
          />
        </div>

        <div className="relative z-10 flex h-full min-h-0 flex-col">
          <TopBar searchValue={query} onSearch={setQuery} />

          {showIncompleteSubmitModal && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
              <div
                className="absolute inset-0 bg-black/55 backdrop-blur-md"
                onClick={() => setShowIncompleteSubmitModal(false)}
              />
              <div
                className={`relative w-full max-w-md overflow-hidden rounded-3xl border p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] ${
                  isDark
                    ? "border-[#8CD559]/20 bg-[#0d1510]/95 text-white"
                    : "border-[#d6e9cf] bg-white/95 text-[#1f2a44]"
                }`}
              >
                <div
                  className={`mb-5 grid h-12 w-12 place-items-center rounded-2xl ${
                    isDark ? "bg-[#8CD559]/15 text-[#8CD559]" : "bg-[#9DE16A]/35 text-[#3E7416]"
                  }`}
                >
                  <ClipboardList size={24} />
                </div>
                <h3 className="text-xl font-black tracking-tight">
                  {t("quizzesPage.unansweredTitle")}
                </h3>
                <p className={`mt-2 text-sm leading-6 ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                  {unansweredDescription}
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setShowIncompleteSubmitModal(false)}
                    className={`flex-1 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                      isDark
                        ? "border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                        : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                    }`}
                  >
                    {t("quizzesPage.answerRemaining")}
                  </button>
                  <button
                    type="button"
                    onClick={submitIncompleteQuiz}
                    disabled={submitting}
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-black transition disabled:opacity-60 ${
                      isDark
                        ? "bg-[#8CD559] text-black hover:bg-[#9DE16A]"
                        : "bg-brandGreen text-white hover:opacity-90"
                    }`}
                  >
                    {submitting ? t("quizzesPage.submitting") : t("quizzesPage.submitAnyway")}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 grid min-h-0 flex-1 gap-4 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]">

            {/* ── SIDEBAR ── */}
            <section
              className={`flex min-h-0 flex-col rounded-xl border p-3 ${
                isDark
                  ? "border-zinc-800 bg-zinc-900/80"
                  : "border-zinc-200 bg-white/90"
              }`}
            >
              <div
                className={`mb-3 flex p-1 rounded-xl ${
                  isDark ? "bg-zinc-800/50" : "bg-zinc-100"
                }`}
              >
                <button
                  onClick={() => onSwitchTab?.("QUIZZES")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                    activityTab === "QUIZZES"
                      ? isDark
                        ? "bg-[#8CD559] text-black shadow-sm"
                        : "bg-white text-brandGreen shadow-sm"
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  {t("quizzesPage.quizzes")}
                </button>
                <button
                  onClick={() => onSwitchTab?.("TASKS")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                    activityTab === "TASKS"
                      ? isDark
                        ? "bg-[#8CD559] text-black shadow-sm"
                        : "bg-white text-brandGreen shadow-sm"
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  {t("quizzesPage.tasks")}
                </button>
              </div>
              <div className="mb-4 flex items-center gap-2 px-1">
                {selectedTopic && (
                  <button
                    onClick={() => setSelectedTopic(null)}
                    className="p-1 hover:bg-zinc-800 rounded-md transition-colors shrink-0"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                {/* --- CHANGED THIS LINE RIGHT HERE --- */}
                <h2 className="text-lg font-bold truncate">
                  {selectedTopic ? displayQuizText(selectedTopic) : t("quizzesPage.quizzes")}
                </h2>
              </div>

              {!selectedTopic && (
                <div
                  className={`mb-4 flex p-1 rounded-xl ${
                    isDark ? "bg-zinc-800/50" : "bg-zinc-100"
                  }`}
                >
                  {(["ALL", "PENDING", "COMPLETED"] as TabType[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                        activeTab === tab
                          ? isDark
                            ? "bg-[#8CD559] text-black shadow-sm"
                            : "bg-white text-brandGreen shadow-sm"
                          : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      {tab === "ALL" ? t("quizzesPage.all") : tab === "PENDING" ? t("quizzesPage.pending") : t("quizzesPage.completed")}
                    </button>
                  ))}
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto space-y-3 pr-1">
                {loading ? (
                  <div className="p-4 text-center animate-pulse text-sm opacity-50">
                    {t("quizzesPage.loadingContent")}
                  </div>
                ) : topicGroups.length === 0 ? (
                  <div className="p-8 text-center text-sm opacity-50">
                    {t("quizzesPage.noQuizzesFound")}
                  </div>
                ) : !selectedTopic ? (
                  topicGroups.map(([topic, quizzes]) => (
                    <button
                      key={topic}
                      onClick={() => setSelectedTopic(topic)}
                      className={`w-full group relative rounded-2xl border p-4 text-left transition-all duration-300 ${
                        isDark
                          ? "border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-800/80"
                          : "border-zinc-200/80 bg-white/60 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-4 min-w-0">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                              isDark
                                ? "bg-zinc-800 text-zinc-400 group-hover:text-[#8CD559]"
                                : "bg-zinc-100 text-zinc-500 group-hover:text-brandGreen"
                            }`}
                          >
                            <BookOpen size={20} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-bold">{displayQuizText(topic)}</h3>
                            <p className="text-xs opacity-50">
                              {quizzes.length} {t("quizzesPage.quizzesAvailable")}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          size={16}
                          className="opacity-40 group-hover:translate-x-1 transition-transform"
                        />
                      </div>
                    </button>
                  ))
                ) : (
                  topicGroups
                    .find((g) => g[0] === selectedTopic)?.[1]
                    .map((assessment) => (
                      <button
                        key={assessment.id}
                        onClick={() => openQuiz(assessment)}
                        className={`w-full group rounded-xl border p-4 text-left transition-all ${
                          selectedQuiz?.id === assessment.id
                            ? isDark
                              ? "border-[#8CD559] bg-[#8CD559]/10"
                              : "border-brandGreen bg-brandGreen/5"
                            : isDark
                            ? "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/80"
                            : "border-zinc-200 bg-white/60 hover:bg-white"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold truncate leading-tight">
                              {displayQuizText(assessment.title)}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-3 opacity-60 text-[11px] font-medium">
                                <span className="flex items-center gap-1.5">
                                  <ClipboardList size={14} />
                                  {assessment.total_questions} {t("quizzesPage.qs")}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Clock3 size={14} />
                                  {assessment.time_limit || "∞"}
                                </span>
                              </div>
                              {assessment.completed && (
                                <div
                                  className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isDark
                                      ? "bg-green-500/10 text-green-400"
                                      : "bg-green-100 text-green-700"
                                  }`}
                                >
                                  <CheckCircle size={10} />
                                  {assessment.score !== null && assessment.score !== undefined
                                    ? `${assessment.score}%`
                                    : t("quizzesPage.done")}
                                </div>
                              )}
                            </div>
                          </div>
                          {loadingQuizId === assessment.id && (
                            <Loader2 size={18} className="animate-spin opacity-50 shrink-0" />
                          )}
                        </div>
                      </button>
                    ))
                )}
              </div>
            </section>

            {/* ── MAIN CONTENT ── */}
            <section
              className={`min-h-0 rounded-xl border flex flex-col overflow-hidden ${
                isDark
                  ? "border-zinc-800 bg-zinc-900/80"
                  : "border-zinc-200 bg-white/90"
              }`}
            >
              {result ? (
                <div className="flex-1 overflow-y-auto p-6 lg:p-10">
                  <div className="mx-auto max-w-3xl">
                    <div className="text-center mb-8">
                      <h2 className="text-3xl font-black italic uppercase tracking-tighter">
                        {t("quizzesPage.quizComplete")}
                      </h2>
                      <div
                        className={`mt-4 inline-flex items-center gap-3 px-6 py-2 rounded-full font-bold text-xl ${
                          isDark ? "bg-[#8CD559] text-black" : "bg-brandGreen text-white"
                        }`}
                      >
                        {t("quizzesPage.score")}: {result.correct_count}/{result.total_questions}
                      </div>
                      <p className="mt-2 text-sm opacity-60">
                        {t("quizzesPage.gotCorrect")
                          .replace("{correct}", String(result.correct_count))
                          .replace("{total}", String(result.total_questions))}
                      </p>
                      {quizError && (
                        <p className="mt-2 text-red-500 font-medium text-sm">{quizError}</p>
                      )}
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-lg font-bold border-b border-zinc-700 pb-2">
                        {t("quizzesPage.questionReview")}
                      </h3>

                      {(!result.correct_answers ||
                        Object.keys(result.correct_answers).length === 0) && (
                        <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-500 rounded-xl font-medium text-sm">
                          {t("quizzesPage.reviewWarning")}
                        </div>
                      )}

                      {selectedQuiz?.questions.map((q, idx) => {
                        const userAns = answers[q.id];
                        const rawCorrectAns =
                          result.correct_answers?.[q.id] ||
                          result.correct_answers?.[String(q.id)];
                        const correctAnsString = rawCorrectAns
                          ? String(rawCorrectAns).toUpperCase().trim()
                          : undefined;
                        const hasBackendAnswer =
                          correctAnsString !== undefined && correctAnsString !== "";
                        const correctChoiceObj = getChoices(q).find(
                          (c) =>
                            c.key === correctAnsString ||
                            c.text.toUpperCase().trim() === correctAnsString
                        );
                        const isCorrect = userAns === correctChoiceObj?.key;

                        return (
                          <div
                            key={q.id}
                            className={`rounded-2xl border p-5 transition-all ${
                              isDark
                                ? "bg-zinc-900/40 border-zinc-800"
                                : "bg-zinc-50 border-zinc-200"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                                  !hasBackendAnswer
                                    ? "bg-zinc-500/20 text-zinc-500"
                                    : isCorrect
                                    ? "bg-green-500/20 text-green-500"
                                    : "bg-red-500/20 text-red-500"
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <p className="font-semibold text-lg">{displayQuizText(q.question_text)}</p>
                            </div>

                            <div className="mt-5 grid gap-2.5">
                              {getChoices(q).map((choice) => {
                                const isUserChoice = userAns === choice.key;
                                const isCorrectChoice = choice.key === correctChoiceObj?.key;

                                let borderStyle = isDark ? "border-zinc-800" : "border-zinc-200";
                                let bgStyle = isDark ? "bg-zinc-800/30" : "bg-white";
                                let textStyle = "opacity-40";

                                if (hasBackendAnswer) {
                                  if (isCorrectChoice) {
                                    borderStyle = "border-green-500/50";
                                    bgStyle = "bg-green-500/10";
                                    textStyle = "text-green-500";
                                  } else if (isUserChoice && !isCorrectChoice) {
                                    borderStyle = "border-red-500/50";
                                    bgStyle = "bg-red-500/10";
                                    textStyle = "text-red-500";
                                  }
                                } else {
                                  if (isUserChoice) {
                                    borderStyle = "border-zinc-500/50";
                                    bgStyle = "bg-zinc-500/10";
                                    textStyle = "text-zinc-500";
                                  }
                                }

                                return (
                                  <div
                                    key={choice.key}
                                    className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium ${borderStyle} ${bgStyle}`}
                                  >
                                    <span className="flex items-center gap-3">
                                      <span className={`font-bold ${textStyle}`}>
                                        {choice.key}.
                                      </span>
                                      {displayQuizText(choice.text)}
                                    </span>
                                    {hasBackendAnswer && isCorrectChoice && (
                                      <CheckCircle2 size={18} className="text-green-500" />
                                    )}
                                    {hasBackendAnswer && isUserChoice && !isCorrectChoice && (
                                      <XCircle size={18} className="text-red-500" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {hasBackendAnswer && !isCorrect && correctChoiceObj && (
                              <div
                                className={`mt-5 p-4 rounded-xl border font-semibold flex items-center gap-2 ${
                                  isDark
                                    ? "bg-zinc-800/50 border-zinc-700 text-zinc-300"
                                    : "bg-zinc-100 border-zinc-200 text-zinc-700"
                                }`}
                              >
                                {t("quizzesPage.correctAnswer")}:{" "}
                                <span className="text-green-500">
                                  {correctChoiceObj.key}. {displayQuizText(correctChoiceObj.text)}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
                      <button
                        onClick={resetQuiz}
                        className={`w-full flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-transform active:scale-95 border ${
                          isDark
                            ? "border-zinc-700 bg-zinc-900/50 text-white hover:bg-zinc-800"
                            : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
                        }`}
                      >
                        <RotateCcw size={18} /> {t("quizzesPage.retakeQuiz")}
                      </button>
                      <button
                        onClick={handlePickAnotherQuiz}
                        className={`w-full flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-transform active:scale-95 ${
                          isDark
                            ? "bg-zinc-100 text-black hover:bg-white"
                            : "bg-zinc-900 text-white hover:bg-black"
                        }`}
                      >
                        <BookOpen size={18} /> {t("quizzesPage.pickAnotherQuiz")}
                      </button>
                    </div>
                  </div>
                </div>
              ) : selectedQuiz ? (
                <div className="flex h-full flex-col">
                  <div
                    className={`border-b px-5 py-4 ${
                      isDark ? "border-zinc-800" : "border-zinc-200"
                    }`}
                  >
                    <p
                      className={`text-xs font-bold uppercase tracking-widest ${
                        isDark ? "text-[#8CD559]" : "text-brandGreen"
                      }`}
                    >
                      {displayQuizText(selectedQuiz.topic)}
                    </p>
                    <h3 className="truncate text-xl font-bold mt-1">
                      {displayQuizText(selectedQuiz.title)}
                    </h3>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto px-5 py-0 pb-6 lg:px-12 flex flex-col">
                    <Stepper
                      initialStep={1}
                      onStepChange={(step) => setCurrentStep(step)}
                      onFinalStepCompleted={submitQuiz}
                      backButtonText={t("quizzesPage.prev")}
                      nextButtonText={t("quizzesPage.next")}
                      submitButtonText={submitting ? t("quizzesPage.submitting") : t("quizzesPage.submitQuiz")}
                      nextButtonProps={{
                        disabled: submitting,
                        className: "duration-350 flex items-center justify-center rounded-xl py-2 px-5 text-sm font-bold tracking-tight text-black transition-all opacity-100 translate-y-0 bg-[#8CD559] hover:bg-[#7bc04e]",
                      }}
                      backButtonProps={{
                        className: `duration-350 rounded-xl px-5 py-2 text-sm font-bold transition-all border ${
                          currentStep === 1
                            ? "pointer-events-none opacity-50 text-zinc-500 border-zinc-800"
                            : "text-white border-zinc-700 bg-zinc-900 hover:bg-zinc-800 active:scale-95"
                        }`,
                      }}
                      stepCircleContainerClassName="w-full max-w-4xl border-none shadow-none bg-transparent"
                      contentClassName="py-0 px-0 sm:px-4"
                    >
                      {selectedQuiz.questions.map((q, index) => (
                        <Step key={q.id}>
                          <div className="mx-auto max-w-2xl py-2">
                            <div className="flex items-center gap-2 text-[11px] font-bold opacity-50 mb-2 uppercase">
                              {t("quizzesPage.questionOf")
                                .replace("{current}", String(index + 1))
                                .replace("{total}", String(selectedQuiz.total_questions))}
                            </div>
                            <h4 className="text-lg sm:text-xl font-semibold leading-snug">
                              {displayQuizText(q.question_text)}
                            </h4>

                            <div className="mt-4 sm:mt-6 space-y-2">
                              {getChoices(q).map((choice) => {
                                const selected = answers[q.id] === choice.key;
                                return (
                                  <button
                                    key={choice.key}
                                    onClick={() =>
                                      setAnswers((prev) => ({
                                        ...prev,
                                        [q.id]: choice.key,
                                      }))
                                    }
                                    className={`flex w-full items-center gap-3 rounded-xl border p-3 sm:p-3.5 text-left transition-all ${
                                      selected
                                        ? isDark
                                          ? "border-[#8CD559] bg-[#8CD559]/10"
                                          : "border-brandGreen bg-brandGreen/5"
                                        : isDark
                                        ? "border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
                                        : "border-zinc-200 bg-white hover:bg-zinc-50"
                                    }`}
                                  >
                                    <span
                                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                                        selected
                                          ? isDark
                                            ? "bg-[#8CD559] text-black border-[#8CD559]"
                                            : "bg-brandGreen text-white border-brandGreen"
                                          : "border-zinc-700 text-zinc-500"
                                      }`}
                                    >
                                      {choice.key}
                                    </span>
                                    <span className="text-sm sm:text-base font-medium">
                                      {displayQuizText(choice.text)}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </Step>
                      ))}
                    </Stepper>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center opacity-30">
                  <div
                    className={`h-20 w-20 rounded-3xl flex items-center justify-center mb-4 ${
                      isDark
                        ? "bg-zinc-800 text-zinc-500"
                        : "bg-zinc-200 text-zinc-400"
                    }`}
                  >
                    <ClipboardList size={40} />
                  </div>
                  <h3 className="text-xl font-bold">{t("quizzesPage.noQuizSelected")}</h3>
                  <p className="text-sm max-w-xs mt-2">
                    {t("quizzesPage.pickTopicToStart")}
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}