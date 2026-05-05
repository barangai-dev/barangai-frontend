"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { BookOpen, ClipboardPen, ArrowRight, ClipboardList, Clock3, Brain } from "lucide-react";
import { API_BASE_URL } from "@/lib/auth";
import { LessonRecord, mapLesson, readCachedLessons, writeCachedLessons } from "@/lib/lessonProgress";
import { fetchGeneralStatisticsReport, type GeneralStatisticsReport } from "@/lib/statistics";
import { useTheme } from "@/context/theme";

interface QuizRecord {
  id: number;
  title: string;
  topic: string;
  total_questions: number;
  time_limit?: number | null;
}

// Phrases to cycle through while the data is fetching
const LOADING_STEPS = [
  "Analyzing your recent quiz scores...",
  "Identifying areas for improvement...",
  "Calculating personalized topics...",
  "Curating targeted lessons...",
  "Preparing your dashboard..."
];

export default function CardsRow() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [quizzes, setQuizzes] = useState<QuizRecord[]>([]);
  const [reportData, setReportData] = useState<GeneralStatisticsReport | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [entered, setEntered] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  // Loading Text Cycler
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 1500); // Changes text every 1.5 seconds
      return () => clearInterval(interval);
    }
  }, [loading]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const baseUrl = API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`;

        // Run fetches in parallel for speed
        const [statsRes, lessonsRes, quizzesRes] = await Promise.allSettled([
          fetchGeneralStatisticsReport(),
          fetch(`${baseUrl}lessons/`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
          fetch(`${baseUrl}quizzes/`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : [])
        ]);

        if (statsRes.status === "fulfilled") {
          setReportData(statsRes.value);
        }

        if (lessonsRes.status === "fulfilled") {
          const lessonItems = Array.isArray(lessonsRes.value) ? lessonsRes.value : Array.isArray(lessonsRes.value?.results) ? lessonsRes.value.results : [];
          const mappedLessons = lessonItems.map((item: any, index: number) => mapLesson(item, index + 1));
          writeCachedLessons(mappedLessons);
          setLessons(mappedLessons);
        }

        if (quizzesRes.status === "fulfilled") {
          const quizItems = Array.isArray(quizzesRes.value) ? quizzesRes.value : Array.isArray(quizzesRes.value?.results) ? quizzesRes.value.results : [];
          const mappedQuizzes = quizItems.map((q: any) => ({
            id: q.id,
            title: q.lesson?.title || q.topic || `Assessment ${q.id}`,
            topic: q.lesson?.category?.name || q.title || "General",
            total_questions: q.questions?.length || q.total_questions || 0,
            time_limit: q.time_limit || null,
          }));
          setQuizzes(mappedQuizzes);
        }
      } catch (err) {
        console.error("Failed to load recommendations", err);
      } finally {
        // Adding a tiny artificial delay ensures the loading animation doesn't flash too quickly if internet is fast
        setTimeout(() => setLoading(false), 800);
      }
    };

    fetchAllData();
  }, []);

  // Trigger entrance animation
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setEntered(true), 100);
      return () => clearTimeout(t);
    }
  }, [loading]);

  // Determine user's TOP 3 weakest topics
  const top3Weaknesses = useMemo(() => {
    if (!reportData || !reportData.weaknesses || reportData.weaknesses.length === 0) return [];
    return [...reportData.weaknesses]
      .sort((a, b) => a.accuracy_percent - b.accuracy_percent)
      .slice(0, 3);
  }, [reportData]);

  // Filter up to 3 Lessons matching the weak topics
  const recommendedLessons = useMemo(() => {
    if (top3Weaknesses.length > 0) {
      const weakTopics = top3Weaknesses.map(w => w.topic);
      const targeted = lessons.filter(l => weakTopics.includes(l.topic));
      const others = lessons.filter(l => !weakTopics.includes(l.topic));
      return [...targeted, ...others].slice(0, 3);
    }
    return lessons.slice(0, 3);
  }, [lessons, top3Weaknesses]);

  // Filter up to 3 Quizzes matching the weak topics
  const recommendedQuizzes = useMemo(() => {
    if (top3Weaknesses.length > 0) {
      const weakTopics = top3Weaknesses.map(w => w.topic);
      const targeted = quizzes.filter(q => weakTopics.includes(q.topic));
      const others = quizzes.filter(q => !weakTopics.includes(q.topic));
      return [...targeted, ...others].slice(0, 3);
    }
    return quizzes.slice(0, 3);
  }, [quizzes, top3Weaknesses]);

  // Standardized Glass Classes
  const glassCardClasses = `relative flex flex-col justify-between p-5 rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
    isDark
      ? "bg-[#1A322D]/40 border-white/10 shadow-black/40 hover:bg-[#1A322D]/60 hover:border-white/20"
      : "bg-white border-[#1A322D]/10 shadow-[#1A322D]/5 hover:bg-slate-50 hover:border-[#1A322D]/20"
  }`;

  // --- DYNAMIC LOADING UI ---
  if (loading) {
    return (
      <div className={`w-full mt-8 p-10 rounded-[2rem] border backdrop-blur-xl flex flex-col items-center justify-center min-h-[300px] transition-all duration-500 ${
        isDark ? "bg-[#1A322D]/20 border-white/5 shadow-black/40" : "bg-white/60 border-[#1A322D]/10 shadow-[#1A322D]/5"
      }`}>
        <div className="relative flex items-center justify-center mb-6 w-24 h-24">
          {/* Glowing background blur */}
          <div className={`absolute inset-0 blur-2xl rounded-full animate-pulse ${isDark ? "bg-[#B4ED7C]/20" : "bg-[#5A9B29]/20"}`} />
          
          {/* Inner circle with Brain */}
          <div className={`relative flex items-center justify-center w-16 h-16 rounded-full shadow-inner ${isDark ? "bg-[#1A322D]" : "bg-white"}`}>
            <Brain size={32} className={`animate-pulse ${isDark ? "text-[#B4ED7C]" : "text-[#5A9B29]"}`} />
          </div>

          {/* Spinning Ring */}
          <svg className="absolute inset-0 w-full h-full animate-[spin_3s_linear_infinite]" viewBox="0 0 100 100">
            <circle 
              cx="50" cy="50" r="48" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeDasharray="100 200" 
              className={isDark ? "text-[#B4ED7C]/60" : "text-[#5A9B29]/60"} 
              strokeLinecap="round" 
            />
            <circle 
              cx="50" cy="50" r="48" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeDasharray="40 200" 
              strokeDashoffset="150"
              className={isDark ? "text-[#B4ED7C]/30" : "text-[#5A9B29]/30"} 
              strokeLinecap="round" 
            />
          </svg>
        </div>
        
        <h3 className="text-xl font-bold mb-2">Generating Learning Path</h3>
        <p className={`text-sm font-medium animate-pulse transition-opacity duration-300 ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
          {LOADING_STEPS[loadingStepIndex]}
        </p>
      </div>
    );
  }

  if (recommendedLessons.length === 0 && recommendedQuizzes.length === 0) {
    return null;
  }

  const weakTopicsString = top3Weaknesses.map(w => w.topic).join(", ");

  return (
    <div className="w-full mt-8 space-y-10">
      
      {/* --- RECOMMENDED LESSONS --- */}
      {recommendedLessons.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BookOpen className={isDark ? "text-[#B4ED7C]" : "text-[#5A9B29]"} size={22} />
                Recommended Lessons
              </h2>
              {top3Weaknesses.length > 0 && (
                <p className={`text-sm mt-1 max-w-2xl truncate ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                  Focused on your top areas for improvement: <span className="font-semibold">{weakTopicsString}</span>
                </p>
              )}
            </div>
            <Link 
              href="/courses" 
              className={`shrink-0 text-sm font-semibold flex items-center gap-1 transition-colors ${isDark ? "text-[#B4ED7C] hover:text-white" : "text-[#5A9B29] hover:text-[#034440]"}`}
            >
              View More <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recommendedLessons.map((lesson, idx) => (
              <div 
                key={`lesson-${lesson.id}`} 
                className={`${glassCardClasses} ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={{ transitionDelay: `${idx * 100}ms` }}
              >
                <div>
                  <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-[#B4ED7C]" : "text-[#5A9B29]"}`}>
                    {lesson.topic}
                  </div>
                  <h3 className="text-[15px] font-bold mb-1">{lesson.title}</h3>
                  <p className={`text-xs line-clamp-2 ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                    {lesson.content || "Review the core concepts and build a stronger foundation in this subject."}
                  </p>
                </div>

                <div className="mt-5">
                  <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Progress</span>
                    <span className={isDark ? "text-[#B4ED7C]" : "text-[#5A9B29]"}>{lesson.progress ?? 0}%</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-black/5"}`}>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#5A9B29] to-[#B4ED7C]"
                      style={{ width: `${lesson.progress ?? 0}%` }}
                    />
                  </div>

                  <Link
                    href={`/courses/${lesson.id}`}
                    className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                      isDark 
                        ? "bg-white/5 hover:bg-white/10 text-white border border-white/10" 
                        : "bg-slate-50 hover:bg-slate-100 text-[#034440] border border-black/5"
                    }`}
                  >
                    Start Lesson
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- RECOMMENDED QUIZZES --- */}
      {recommendedQuizzes.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ClipboardPen className={isDark ? "text-blue-400" : "text-blue-600"} size={22} />
                Available Quizzes
              </h2>
              {top3Weaknesses.length > 0 && (
                <p className={`text-sm mt-1 max-w-2xl truncate ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                  Test your retention on: <span className="font-semibold">{weakTopicsString}</span>
                </p>
              )}
            </div>
            <Link 
              href="/activities" 
              className={`shrink-0 text-sm font-semibold flex items-center gap-1 transition-colors ${isDark ? "text-blue-300 hover:text-blue-200" : "text-blue-600 hover:text-blue-800"}`}
            >
              View More <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recommendedQuizzes.map((quiz, idx) => (
              <div 
                key={`quiz-${quiz.id}`} 
                className={`${glassCardClasses} ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={{ transitionDelay: `${(idx + 3) * 100}ms` }}
              >
                <div>
                  <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-blue-300" : "text-blue-600"}`}>
                    {quiz.topic}
                  </div>
                  <h3 className="text-[15px] font-bold mb-3">{quiz.title}</h3>
                  
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                      <ClipboardList size={14} />
                      {quiz.total_questions} Questions
                    </div>
                    {quiz.time_limit && (
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                        <Clock3 size={14} />
                        {quiz.time_limit} Mins
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5">
                  <Link
                    href={`/activities?topic=${encodeURIComponent(quiz.topic)}&lessonId=${quiz.id}`}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                      isDark 
                        ? "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20" 
                        : "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                    }`}
                  >
                    Take Quiz
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}