"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, ExternalLink, FileImage, FileText, Loader2, Send, XCircle } from "lucide-react";
import { useTheme } from "@/context/theme";
import TopBar from "@/components/dashboard/TopBar";
import {
  ActivityItem,
  ActivitySubmission,
  fetchAllActivities,
  submitActivity,
} from "@/lib/activities";

type ActivityTab = "QUIZZES" | "TASKS";

function getEmbeddedVideo(url?: string | null): { type: "iframe" | "video"; src: string } | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    if (host.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) return { type: "iframe", src: `https://www.youtube.com/embed/${id}` };
    }
    if (host === "youtu.be") {
      const id = parsed.pathname.replace("/", "");
      if (id) return { type: "iframe", src: `https://www.youtube.com/embed/${id}` };
    }
    if (host.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      if (id) return { type: "iframe", src: `https://player.vimeo.com/video/${id}` };
    }

    const isDirectVideo =
      path.endsWith(".mp4") || path.endsWith(".webm") || path.endsWith(".ogg") || path.endsWith(".mov");
    if (isDirectVideo) return { type: "video", src: url };
  } catch {
    return null;
  }
  return null;
}

function statusStyles(status?: ActivitySubmission["status"], isDark?: boolean) {
  if (status === "PASSED") return isDark ? "bg-green-500/15 text-green-300" : "bg-green-100 text-green-700";
  if (status === "FAILED") return isDark ? "bg-red-500/15 text-red-300" : "bg-red-100 text-red-700";
  return isDark ? "bg-yellow-500/15 text-yellow-300" : "bg-yellow-100 text-yellow-700";
}

type TasksPanelProps = {
  activityTab?: ActivityTab;
  onSwitchTab?: (tab: ActivityTab) => void;
};

export default function TasksPanel({ activityTab = "TASKS", onSwitchTab }: TasksPanelProps) {
  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ActivityItem | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [imageAnswer, setImageAnswer] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchAllActivities();
        setActivities(data);
      } catch (err: any) {
        setError(err?.message || "Failed to load activities.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selected && activities.length > 0) setSelected(activities[0]);
  }, [activities, selected]);

  useEffect(() => {
    if (!imageAnswer) {
      setImagePreview(null);
      return;
    }
    const nextPreview = URL.createObjectURL(imageAnswer);
    setImagePreview(nextPreview);
    return () => URL.revokeObjectURL(nextPreview);
  }, [imageAnswer]);

  const activityGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const visible = activities.filter((a) => {
      if (!normalizedQuery) return true;
      return (
        a.title.toLowerCase().includes(normalizedQuery) ||
        a.content.toLowerCase().includes(normalizedQuery)
      );
    });
    const pending = visible.filter((a) => !a.user_submission || a.user_submission.status === "MANUAL_REVIEW");
    const finished = visible.filter((a) => a.user_submission?.status === "PASSED" || a.user_submission?.status === "FAILED");
    return { pending, finished };
  }, [activities, query]);
  const embeddedVideo = useMemo(() => getEmbeddedVideo(selected?.url), [selected?.url]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (!imageAnswer && !textAnswer.trim()) {
      setError("Please provide at least a text answer or an image file.");
      return;
    }

    const hasPriorSubmission = Boolean(selected.user_submission);
    if (hasPriorSubmission) {
      const confirmed = window.confirm(
        "You already submitted this task. Resubmitting will replace your previous answer. Continue?"
      );
      if (!confirmed) return;
    }

    setSubmitLoading(true);
    setError("");
    setMessage("");
    try {
      const submission = await submitActivity(selected.id, {
        textAnswer,
        imageFile: imageAnswer,
      });
      setActivities((prev) =>
        prev.map((item) => (item.id === selected.id ? { ...item, user_submission: submission } : item))
      );
      setMessage("Submission sent for manual review.");
      setImageAnswer(null);
      setImagePreview(null);
      setTextAnswer("");
    } catch (err: any) {
      setError(err?.message || "Submission failed.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const onFileChange = (file: File | null) => {
    setError("");
    if (!file) {
      setImageAnswer(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      setImageAnswer(null);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(`Image is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`);
      setImageAnswer(null);
      return;
    }
    setImageAnswer(file);
  };

  return (
    <div className="h-screen overflow-hidden p-4 lg:p-5">
      <div className="mb-3">
        <TopBar searchValue={query} onSearch={setQuery} />
      </div>
      <div className="grid h-[calc(100vh-8.5rem)] gap-5 lg:grid-cols-[400px_minmax(0,1fr)]">
        <section className={`rounded-3xl border p-4 min-h-0 overflow-y-auto ${isDark ? "border-zinc-800 bg-zinc-900/90 text-white" : "border-zinc-200 bg-white/95"}`}>
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
              Quizzes
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
              Tasks
            </button>
          </div>
          <div className={`mb-4 rounded-2xl border px-4 py-3 ${isDark ? "border-zinc-800 bg-zinc-800/40" : "border-zinc-200 bg-zinc-50"}`}>
            <h2 className="text-xl font-bold">Task Activities</h2>
            <p className={`text-sm mt-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Choose a task, submit your work, and wait for admin review.
            </p>
          </div>
          {loading ? (
            <p className="text-base opacity-70 flex items-center gap-2"><Loader2 size={18} className="animate-spin" />Loading tasks...</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase opacity-60 mb-2">Pending ({activityGroups.pending.length})</p>
                <div className="space-y-3">
                  {activityGroups.pending.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelected(item)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === item.id ? "border-brandGreen shadow-sm" : isDark ? "border-zinc-800 hover:border-zinc-700" : "border-zinc-200 hover:border-zinc-300"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-base">{item.title}</p>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-600"}`}>
                          {item.activity_type}
                        </span>
                      </div>
                    </button>
                  ))}
                  {activityGroups.pending.length === 0 && <p className="text-sm opacity-60">No pending tasks.</p>}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase opacity-60 mb-2">Reviewed ({activityGroups.finished.length})</p>
                <div className="space-y-3">
                  {activityGroups.finished.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelected(item)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === item.id ? "border-brandGreen shadow-sm" : isDark ? "border-zinc-800 hover:border-zinc-700" : "border-zinc-200 hover:border-zinc-300"}`}
                    >
                      <p className="font-semibold text-base">{item.title}</p>
                      <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles(item.user_submission?.status, isDark)}`}>
                        {item.user_submission?.status || "MANUAL_REVIEW"}
                      </p>
                    </button>
                  ))}
                  {activityGroups.finished.length === 0 && <p className="text-sm opacity-60">No reviewed tasks yet.</p>}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className={`rounded-3xl border p-6 min-h-0 overflow-y-auto ${isDark ? "border-zinc-800 bg-zinc-900/90 text-white" : "border-zinc-200 bg-white/95"}`}>
          {!selected ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-base opacity-70">Select a task from the left panel to view details.</p>
            </div>
          ) : (
            <div className="max-w-3xl space-y-5">
              <div>
                <button
                  onClick={() => setSelected(null)}
                  className={`inline-flex items-center gap-2 mb-3 text-sm font-semibold ${isDark ? "text-zinc-300 hover:text-white" : "text-zinc-600 hover:text-zinc-900"}`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to task list
                </button>
                <h3 className="text-3xl font-bold">{selected.title}</h3>
                <p className="mt-3 text-base opacity-80 leading-relaxed">{selected.content}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-700"}`}>
                    {selected.activity_type === "IMAGE" ? <FileImage className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                    {selected.activity_type}
                  </span>
                  {selected.url && (
                    <a className={`text-sm font-semibold underline ${isDark ? "text-accentGreen" : "text-brandGreen"}`} href={selected.url} target="_blank" rel="noreferrer">
                      Open reference link
                    </a>
                  )}
                </div>
              </div>

              {embeddedVideo && (
                <div className={`rounded-2xl border p-4 ${isDark ? "border-zinc-700 bg-zinc-800/35" : "border-zinc-200 bg-zinc-50/70"}`}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-sm font-semibold">Activity Video</p>
                    {selected.url && (
                      <a
                        href={selected.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold underline ${isDark ? "text-accentGreen" : "text-brandGreen"}`}
                      >
                        Open source
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  {embeddedVideo.type === "iframe" ? (
                    <div className={`relative w-full overflow-hidden rounded-xl border ${isDark ? "border-zinc-700 bg-black" : "border-zinc-200 bg-white"}`} style={{ paddingTop: "56.25%" }}>
                      <iframe
                        src={embeddedVideo.src}
                        title="Activity video"
                        className="absolute top-0 left-0 h-full w-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className={`rounded-xl border p-1 ${isDark ? "border-zinc-700 bg-black" : "border-zinc-200 bg-white"}`}>
                      <video controls className="w-full rounded-lg" src={embeddedVideo.src} />
                    </div>
                  )}
                </div>
              )}

              {selected.user_submission && (
                <div className={`rounded-2xl border p-4 ${isDark ? "border-zinc-700 bg-zinc-800/50" : "border-zinc-200 bg-zinc-50"}`}>
                  <p className="text-sm opacity-70 mb-1">Latest submission</p>
                  <div className="flex items-center gap-2">
                    {selected.user_submission.status === "PASSED" ? <CheckCircle2 size={18} className="text-green-500" /> : selected.user_submission.status === "FAILED" ? <XCircle size={18} className="text-red-500" /> : <Clock3 size={18} className="text-yellow-500" />}
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusStyles(selected.user_submission.status, isDark)}`}>{selected.user_submission.status}</span>
                  </div>
                </div>
              )}

              <form className={`space-y-4 rounded-2xl border p-5 ${isDark ? "border-zinc-700 bg-zinc-800/35" : "border-zinc-200 bg-zinc-50/80"}`} onSubmit={onSubmit}>
                <p className="text-lg font-semibold">Submit Your Output</p>
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  rows={5}
                  placeholder="Optional text answer..."
                  className={`w-full rounded-xl border p-4 text-base outline-none ${isDark ? "border-zinc-700 bg-zinc-900 focus:border-zinc-500" : "border-zinc-200 bg-white focus:border-zinc-400"}`}
                />
                <div>
                  <label className="text-base font-medium block mb-2">Upload screenshot/image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                    className="w-full text-base"
                  />
                  <p className="text-sm opacity-60 mt-1">Accepted: image files up to {MAX_FILE_SIZE_MB}MB.</p>
                  {imagePreview && (
                    <div className={`mt-2 rounded-lg border p-2 ${isDark ? "border-zinc-700 bg-zinc-800/60" : "border-zinc-200 bg-zinc-50"}`}>
                      <img src={imagePreview} alt="Selected preview" className="max-h-56 rounded-md object-contain" />
                    </div>
                  )}
                </div>
                {message && <p className="text-base text-green-500">{message}</p>}
                {error && <p className="text-base text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={submitLoading}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-base font-semibold ${isDark ? "bg-accentGreen text-black" : "bg-brandGreen text-white"} disabled:opacity-60`}
                >
                  <Send className="w-4 h-4" />
                  {submitLoading ? "Submitting..." : "Submit Task"}
                </button>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
