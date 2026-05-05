"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, RefreshCw } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import { useTheme } from "@/context/theme";
import { PendingSubmission, fetchPendingSubmissions, gradeSubmission } from "@/lib/activities";

export default function AdminActivitiesPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [collapsed, setCollapsed] = useState(false);
  const [items, setItems] = useState<PendingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const v = localStorage.getItem("sidebar_collapsed");
      if (v !== null) setCollapsed(v === "true");
    } catch {}
  }, []);

  const toggle = () => {
    setCollapsed((s) => {
      const next = !s;
      try {
        localStorage.setItem("sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchPendingSubmissions();
      setItems(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onGrade = async (submissionId: number, action: "APPROVE" | "REJECT") => {
    setError("");
    setMessage("");
    try {
      await gradeSubmission(submissionId, action);
      setItems((prev) => prev.filter((item) => item.id !== submissionId));
      setMessage(action === "APPROVE" ? "Submission marked as PASSED." : "Submission marked as FAILED.");
    } catch (err: any) {
      setError(err?.message || "Grading failed.");
    }
  };

  const pendingCount = items.length;

  return (
    <div className="min-h-screen flex">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <main className={`flex-1 p-6 ${isDark ? "text-white" : "text-black"}`}>
        <TopBar hideSearch />
        <div className="max-w-6xl mx-auto mt-4 space-y-4">
          <div className={`rounded-2xl border p-5 ${isDark ? "border-zinc-800 bg-zinc-900/70" : "border-zinc-200 bg-white"}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <Link
                  href="/admin"
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold border transition ${isDark ? "border-zinc-700 bg-zinc-800 hover:bg-zinc-700" : "border-zinc-200 bg-zinc-100 hover:bg-zinc-200"}`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Link>
                <h1 className="text-2xl font-bold">Activity Submissions</h1>
                <p className={`text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  Review task outputs and mark each submission as pass or fail.
                </p>
              </div>
              <button
                onClick={load}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border transition ${isDark ? "border-zinc-700 bg-zinc-800 hover:bg-zinc-700" : "border-zinc-200 bg-zinc-100 hover:bg-zinc-200"}`}
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`rounded-xl border p-4 ${isDark ? "border-zinc-800 bg-zinc-900/70" : "border-zinc-200 bg-white"}`}>
              <p className={`text-xs font-semibold uppercase ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>Pending Queue</p>
              <p className="text-3xl font-bold mt-1">{pendingCount}</p>
            </div>
            <div className={`rounded-xl border p-4 ${isDark ? "border-zinc-800 bg-zinc-900/70" : "border-zinc-200 bg-white"}`}>
              <p className={`text-xs font-semibold uppercase ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>Last Action</p>
              <p className="text-sm font-semibold mt-2">{message || "No actions yet"}</p>
            </div>
            <div className={`rounded-xl border p-4 ${isDark ? "border-zinc-800 bg-zinc-900/70" : "border-zinc-200 bg-white"}`}>
              <p className={`text-xs font-semibold uppercase ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>Status</p>
              <p className={`text-sm font-semibold mt-2 ${error ? "text-red-500" : isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                {error || "Ready for review"}
              </p>
            </div>
          </div>

          {message && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-green-200 bg-green-50 text-green-700"}`}>
              {message}
            </div>
          )}
          {error && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`}>
              {error}
            </div>
          )}

          {loading ? (
            <div className={`rounded-xl border p-6 text-sm opacity-70 ${isDark ? "border-zinc-800 bg-zinc-900/70" : "border-zinc-200 bg-white"}`}>
              Loading submissions...
            </div>
          ) : items.length === 0 ? (
            <div className={`rounded-xl border p-6 text-sm opacity-70 ${isDark ? "border-zinc-800 bg-zinc-900/70" : "border-zinc-200 bg-white"}`}>
              No pending submissions.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {items.map((item) => (
                <article key={item.id} className={`rounded-2xl border p-5 shadow-sm transition ${isDark ? "border-zinc-700 bg-zinc-900/75 hover:border-zinc-600" : "border-zinc-200 bg-white hover:border-zinc-300"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-bold">{item.activity_title}</p>
                      <p className="text-xs opacity-70 mt-1">{item.lesson_title}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isDark ? "bg-yellow-500/15 text-yellow-300" : "bg-yellow-100 text-yellow-700"}`}>
                      Manual Review
                    </span>
                  </div>

                  <div className={`mt-3 rounded-xl border px-3 py-2 text-sm ${isDark ? "border-zinc-800 bg-zinc-800/40" : "border-zinc-200 bg-zinc-50"}`}>
                    <p className="font-semibold">{item.user_name}</p>
                    <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>{item.user_email}</p>
                  </div>

                  {item.text_answer && (
                    <div className={`mt-3 rounded-xl p-3 text-sm ${isDark ? "bg-zinc-800" : "bg-zinc-100"}`}>
                      {item.text_answer}
                    </div>
                  )}
                  {item.image_url && (
                    <div className="mt-3 space-y-2">
                      <a href={item.image_url} target="_blank" rel="noreferrer" className={`inline-block text-sm font-semibold underline ${isDark ? "text-accentGreen" : "text-brandGreen"}`}>
                        View uploaded image
                      </a>
                      <a href={item.image_url} target="_blank" rel="noreferrer">
                        <img
                          src={item.image_url}
                          alt="Submission preview"
                          className={`w-full max-h-48 rounded-xl border object-cover ${isDark ? "border-zinc-700" : "border-zinc-200"}`}
                        />
                      </a>
                    </div>
                  )}
                  <p className="text-xs opacity-60 mt-3">Submitted: {new Date(item.submitted_at).toLocaleString()}</p>

                  <div className="flex gap-2 mt-4">
                    <button onClick={() => onGrade(item.id, "APPROVE")} className="rounded-xl bg-green-600 text-white px-4 py-2 text-sm font-semibold hover:bg-green-500 transition">
                      Pass
                    </button>
                    <button onClick={() => onGrade(item.id, "REJECT")} className="rounded-xl bg-red-600 text-white px-4 py-2 text-sm font-semibold hover:bg-red-500 transition">
                      Fail
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
