"use client"

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/auth";
import { useTheme } from "@/context/theme";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import {
  Check, X, Trash2, Search, RefreshCw, AlertCircle, Users,
  BookOpen, ClipboardList, Plus, Pencil, BarChart3, ChevronLeft, Settings
} from "lucide-react";

// ... (keep all your existing types: UserStats, UserItem, QuestionInput) ...
type UserStats = {
  pre_assessment?: { score: number; completed_at: string };
  lesson_progress: { title: string; topic?: string; progress: number; completed: boolean }[];
  quiz_history: { quiz_title: string; score: number; date: string; correct_count: number; total_questions: number }[];
};

type UserItem = {
  id: number; email: string; password?: string; role?: string;
  is_active?: boolean; is_approved?: boolean; stats?: UserStats; [k: string]: any;
};

type QuestionInput = {
  id?: number; question_text: string; option_a: string; option_b: string;
  option_c: string; option_d: string; correct_choice: string;
};

function isUserExplicitlyApproved(user: any): boolean {
  if (!user || typeof user !== "object") return false;

  // Booleans win first
  if (user.is_approved === false || user.isApproved === false || user.approved === false) {
    return false;
  }
  if (user.is_approved === true || user.isApproved === true || user.approved === true) {
    return true;
  }

  const statusCandidates = [user.approval_status, user.account_status, user.status];
  for (const value of statusCandidates) {
    if (typeof value !== "string") continue;
    const normalized = value.trim().toLowerCase();
    if (!normalized) continue;

    // Must run BEFORE "includes('approved')" — e.g. "not approved" contains substring "approved"
    if (
      normalized.includes("not approved") ||
      normalized.includes("unapproved") ||
      normalized.includes("pending") ||
      normalized.includes("awaiting") ||
      normalized.includes("rejected") ||
      normalized.includes("denied")
    ) {
      return false;
    }

    if (
      normalized === "approved" ||
      normalized.endsWith(" approved") ||
      normalized.startsWith("approved ") ||
      normalized.includes("fully approved")
    ) {
      return true;
    }
  }

  return false;
}

export default function AdminDashboard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Added "settings" to the activeTab options
  const [activeTab, setActiveTab] = useState<"users" | "courses" | "quizzes" | "tracking" | "settings">("users");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Banner state
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    try { 
      const v = localStorage.getItem("sidebar_collapsed"); 
      if (v !== null) setSidebarCollapsed(v === "true"); 
      
      const b = localStorage.getItem("show_maintenance_banner");
      if (b !== null) setShowBanner(b === "true");
    } catch {}
  }, []);

  // ... (keep all your existing state declarations: lastRefreshed, users, etc.) ...
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserItem[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingQuery, setPendingQuery] = useState("");
  const [approvedQuery, setApprovedQuery] = useState("");

  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [courseThumbnail, setCourseThumbnail] = useState<File | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseTopic, setCourseTopic] = useState("");
  const [courseContent, setCourseContent] = useState("");
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [courseMsg, setCourseMsg] = useState("");

  const [quizzesList, setQuizzesList] = useState<any[]>([]);
  const [editingQuizId, setEditingQuizId] = useState<number | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizLessonId, setQuizLessonId] = useState("");
  const [questions, setQuestions] = useState<QuestionInput[]>([{ question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_choice: "A" }]);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [quizMsg, setQuizMsg] = useState("");
  const [adminLessons, setAdminLessons] = useState<any[]>([]);

  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [trackingQuery, setTrackingQuery] = useState("");

  const handleSidebarToggle = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try { localStorage.setItem("sidebar_collapsed", String(next)); } catch {}
  };

  // Toggle handler for the banner
  const handleToggleBanner = () => {
    const next = !showBanner;
    setShowBanner(next);
    localStorage.setItem("show_maintenance_banner", String(next));
    window.dispatchEvent(new Event("banner_toggle"));
  };

  // ... (keep all your existing functions: getAccessToken, fetchPending, useEffect hooks, handleAction, course/quiz logic, etc.) ...
  const getAccessToken = async () => {
    let token = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");
    if (!token && refreshToken) {
      try {
        const res = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/accounts/token/`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: refreshToken }),
        });
        const data = await res.json();
        if (res.ok) { localStorage.setItem("access_token", data.access); return data.access; }
      } catch {}
    }
    return token;
  };

  const fetchPending = async () => {
    setLoading(true); setError(null);
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/accounts/users/`, { headers });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const mapped: UserItem[] = data.map((u: any, idx: number) => ({
          id: u.id ?? idx + 1,
          email: u.email ?? u.user?.email ?? u.user ?? "",
          password: u.password ?? u.raw_password ?? undefined,
          role: u.role ?? undefined,
          is_active: u.is_active ?? u.isActive ?? undefined,
          is_approved: u.is_approved ?? u.isApproved ?? undefined, ...u,
        }));
        setUsers(mapped);
        // Important: pending users may still be is_active=true in some backends.
        // Approval list should only use explicit approval flags/status.
        const approved = mapped.filter((x) => isUserExplicitlyApproved(x));
        setApprovedUsers(approved);
        setPendingUsers(mapped.filter((x) => !isUserExplicitlyApproved(x)));
        setLastRefreshed(new Date().toLocaleString());
      }
    } catch {
      setError("Unable to load users from server.");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchPending(); }, []);

  useEffect(() => {
    if (activeTab !== "courses" && activeTab !== "quizzes") return;
    (async () => {
      setLoading(true); setError(null);
      try {
        const token = await getAccessToken();
        const headers: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
        const lr = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/lessons/`, { headers });
        if (!lr.ok) throw new Error("Failed to fetch lessons");
        const ld = await lr.json();
        const lessons = Array.isArray(ld) ? ld : ld.results || [];
        setAdminLessons(lessons);
        if (activeTab === "courses") setCoursesList(lessons);
        if (activeTab === "quizzes") {
          const qr = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/quizzes/admin/`, { headers });
          if (!qr.ok) throw new Error("Failed to fetch quizzes");
          const qd = await qr.json();
          setQuizzesList(Array.isArray(qd) ? qd : qd.results || []);
        }
      } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    })();
  }, [activeTab]);

  const handleAction = async (id: number, action: "approve" | "reject") => {
    setError(null); setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/accounts/users/${id}/${action === "approve" ? "approve" : "delete"}/`, { method: action === "approve" ? "PATCH" : "DELETE", headers });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      await fetchPending();
    } catch (err: any) { setError(`Unable to ${action} user: ${err?.message}`); await fetchPending(); }
    finally { setLoading(false); }
  };

  const handleStartEditCourse = (course: any) => { setEditingCourseId(course.id); setCourseTitle(course.title || ""); setCourseTopic(course.topic || ""); setCourseContent(course.content || ""); setCourseThumbnail(null); setCourseMsg(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const cancelCourseEdit = () => { setEditingCourseId(null); setCourseTitle(""); setCourseTopic(""); setCourseContent(""); setCourseThumbnail(null); setCourseMsg(""); };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault(); setCreatingCourse(true); setCourseMsg("");
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {}; if (token) headers["Authorization"] = `Bearer ${token}`;
      const fd = new FormData();
      fd.append("title", courseTitle); fd.append("topic", courseTopic); fd.append("content", courseContent);
      if (courseThumbnail) fd.append("thumbnail", courseThumbnail);
      const isEditing = editingCourseId !== null;
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/lessons/${isEditing ? `${editingCourseId}/` : ""}`, { method: isEditing ? "PATCH" : "POST", headers, body: fd });
      if (!res.ok) { const ed = await res.json().catch(() => ({ detail: "Failed" })); throw new Error(ed.detail || "Failed"); }
      setCourseMsg(isEditing ? "Course updated successfully! ✅" : "Course created successfully! ✅");
      cancelCourseEdit();
      const lr = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/lessons/`, { headers });
      const ld = await lr.json(); setCoursesList(Array.isArray(ld) ? ld : ld.results || []);
    } catch (err: any) { setCourseMsg("Error: " + err.message); } finally { setCreatingCourse(false); }
  };

  const handleDeleteCourse = async (id: number) => {
    if (!window.confirm("Delete this course? This cannot be undone.")) return;
    setLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/lessons/${id}/`, { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error("Failed to delete");
      setCoursesList(coursesList.filter(c => c.id !== id));
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleStartEditQuiz = (quiz: any) => {
    setEditingQuizId(quiz.id); setQuizTitle(quiz.title || ""); setQuizLessonId(quiz.lesson ? String(quiz.lesson) : "");
    setQuestions(quiz.questions?.length
      ? quiz.questions.map((q: any) => ({ id: q.id, question_text: q.question_text || "", option_a: q.choice_a || q.option_a || "", option_b: q.choice_b || q.option_b || "", option_c: q.choice_c || q.option_c || "", option_d: q.choice_d || q.option_d || "", correct_choice: q.correct_choice || "A" }))
      : [{ question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_choice: "A" }]);
    setQuizMsg(""); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelQuizEdit = () => { setEditingQuizId(null); setQuizTitle(""); setQuizLessonId(""); setQuestions([{ question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_choice: "A" }]); setQuizMsg(""); };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault(); setCreatingQuiz(true); setQuizMsg("");
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" }; if (token) headers["Authorization"] = `Bearer ${token}`;
      const isEditing = editingQuizId !== null;
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/quizzes/admin/${isEditing ? `${editingQuizId}/` : ""}`, {
        method: isEditing ? "PATCH" : "POST", headers,
        body: JSON.stringify({ title: quizTitle, lesson: parseInt(quizLessonId), questions: questions.map(q => ({ ...(q.id ? { id: q.id } : {}), question_text: q.question_text, choice_a: q.option_a, choice_b: q.option_b, choice_c: q.option_c, choice_d: q.option_d, correct_choice: q.correct_choice })) }),
      });
      if (!res.ok) { const ed = await res.json().catch(() => ({ detail: "Failed" })); throw new Error(ed.detail || "Failed"); }
      setQuizMsg(isEditing ? "Quiz updated successfully! ✅" : "Quiz created successfully! ✅");
      cancelQuizEdit();
      const qr = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/quizzes/admin/`, { headers });
      const qd = await qr.json(); setQuizzesList(Array.isArray(qd) ? qd : qd.results || []);
    } catch (err: any) { setQuizMsg("Error: " + err.message); } finally { setCreatingQuiz(false); }
  };

  const addQuestion = () => setQuestions([...questions, { question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_choice: "A" }]);
  const removeQuestion = (i: number) => setQuestions(questions.filter((_, idx) => idx !== i));
  const updateQuestion = (idx: number, field: Exclude<keyof QuestionInput, "id">, value: string) => { const n = [...questions]; n[idx][field] = value; setQuestions(n); };

  const handleDeleteQuiz = async (id: number) => {
    if (!window.confirm("Delete this quiz? This cannot be undone.")) return;
    setLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/quizzes/admin/${id}/`, { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error("Failed to delete");
      setQuizzesList(quizzesList.filter(q => q.id !== id));
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const fetchUserDetails = async (user: UserItem) => {
    setLoading(true); setError(null);
    try {
      const token = await getAccessToken();
      const headers = { Authorization: `Bearer ${token}` };
      const base = API_BASE_URL.replace(/\/$/, "");
      const [pRes, sRes] = await Promise.all([
        fetch(`${base}/accounts/users/${user.id}/progress/`, { headers }),
        fetch(`${base}/accounts/users/${user.id}/statistics/`, { headers }),
      ]);
      if (!pRes.ok || !sRes.ok) throw new Error("Failed to fetch user data");
      const pData = await pRes.json(); const sData = await sRes.json();
      setSelectedUser({ ...user, stats: { pre_assessment: pData.pre_assessment ?? null, lesson_progress: pData.lesson_progress ?? [], quiz_history: sData.quiz_history ?? [] } });
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  /* ── shared style tokens ── */
  const sectionCard = `rounded-2xl border ${isDark ? "bg-zinc-900 border-white/10" : "bg-white border-gray-200 shadow-sm"}`;
  const inputCls = `w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${isDark ? "bg-zinc-800/60 border-white/10 focus:border-white/25 text-white placeholder:text-zinc-600" : "bg-gray-50 border-gray-200 focus:border-gray-400 text-black placeholder:text-gray-400"}`;
  const divider = isDark ? "border-white/10" : "border-gray-100";
  const muted = isDark ? "text-zinc-500" : "text-gray-400";
  const tableRowHover = isDark ? "hover:bg-white/4" : "hover:bg-gray-50";
  const tableDivide = isDark ? "divide-white/5" : "divide-gray-100";

  /* ── shared components ── */
    const RoleBadge = ({ role }: { role?: string }) => {
    // Format the text nicely for the table
    const formattedRole = role ? (
      {
        ADMIN: "Admin",
        CAPTAIN: "Barangay Captain",
        SECRETARY: "Barangay Secretary",
        TREASURER: "Barangay Treasurer",
        KAGAWAD: "Barangay Kagawad",
        ENCODER: "Barangay Encoder",
        OFFICIAL: "Barangay Official",
        GUEST: "Guest"
      }[role.toUpperCase()] || role
    ) : "—";

    // Keep Captains and Admins Green, make everyone else Blue
    const isHighLevel = role === "CAPTAIN" || role === "ADMIN";

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isHighLevel
        ? (isDark ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-green-100 text-green-800")
        : (isDark ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-blue-100 text-blue-800")}`}>
        {formattedRole}
      </span>
    );
  };

  const THead = ({ cols }: { cols: string[] }) => (
    <thead>
      <tr className={`text-xs uppercase tracking-wider ${isDark ? "bg-black/25 text-zinc-500" : "bg-gray-50 text-gray-400"}`}>
        {cols.map((c, i) => <th key={c} className={`px-5 py-3 font-medium ${i === cols.length - 1 ? "text-right" : ""}`}>{c}</th>)}
      </tr>
    </thead>
  );

  const EmptyRow = ({ cols, msg }: { cols: number; msg: string }) => (
    <tr><td colSpan={cols} className={`px-5 py-10 text-center text-sm ${muted}`}>{msg}</td></tr>
  );

  const SearchBox = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
    <div className="relative">
      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${muted}`} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`pl-9 pr-4 py-2 w-52 rounded-full text-sm outline-none border transition-colors ${isDark ? "bg-black/40 border-white/10 focus:border-accentGreen text-white placeholder:text-zinc-600" : "bg-gray-50 border-gray-200 focus:border-brandGreen text-black placeholder:text-gray-400"}`} />
    </div>
  );

  const MsgBanner = ({ msg }: { msg: string }) => msg ? (
    <p className={`text-sm px-4 py-2.5 rounded-xl ${msg.includes("Error") ? (isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600") : (isDark ? "bg-green-500/10 text-green-400" : "bg-green-50 text-green-700")}`}>{msg}</p>
  ) : null;

  // Added Settings to the tabs
  const tabs = [
    { key: "users" as const, icon: Users, label: "Users" },
    { key: "courses" as const, icon: BookOpen, label: "Courses" },
    { key: "quizzes" as const, icon: ClipboardList, label: "Quizzes" },
    { key: "tracking" as const, icon: BarChart3, label: "Tracking" },
    { key: "settings" as const, icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen flex relative">
      <Sidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />

      <main className={`flex-1 p-6 lg:p-8 ${isDark ? "text-white" : "text-black"}`}>
        <div className="max-w-[1200px] mx-auto space-y-5">
          <TopBar hideSearch />

          {/* Header */}
          <div className="flex items-center justify-between mt-1">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className={`text-sm mt-0.5 ${muted}`}>Manage users, courses, quizzes & tracking</p>
            </div>
            <button onClick={fetchPending} disabled={loading}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition disabled:opacity-50 border ${isDark ? "bg-white/6 hover:bg-white/12 text-white border-white/10" : "bg-white hover:bg-gray-50 text-black border-gray-200 shadow-sm"}`}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className={`flex items-center gap-0.5 border-b ${isDark ? "border-white/10" : "border-gray-200"}`}>
            {tabs.map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => { setActiveTab(key); setSelectedUser(null); }}
                className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === key
                  ? (isDark ? "text-accentGreen" : "text-brandGreen")
                  : (isDark ? "text-zinc-400 hover:text-zinc-200" : "text-gray-500 hover:text-gray-700")}`}>
                <Icon size={15} />{label}
                {activeTab === key && <span className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDark ? "bg-accentGreen" : "bg-brandGreen"}`} />}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-sm ${isDark ? "bg-red-500/8 border-red-500/15 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}>
              <AlertCircle size={15} className="shrink-0" />{error}
            </div>
          )}

          {/* ... (Keep USERS, COURSES, QUIZZES, TRACKING exactly as they were) ... */}
          {/* ════ USERS ════ */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Users", value: users.length, cls: "" },
                  { label: "Pending", value: pendingUsers.length, cls: "text-yellow-500" },
                  { label: "Approved", value: approvedUsers.length, cls: isDark ? "text-accentGreen" : "text-brandGreen" },
                ].map(({ label, value, cls }) => (
                  <div key={label} className={`${sectionCard} px-5 py-4`}>
                    <p className={`text-xs font-medium ${muted}`}>{label}</p>
                    <p className={`text-3xl font-bold mt-1 ${cls}`}>{value}</p>
                    {label === "Approved" && lastRefreshed && <p className={`text-xs mt-2 ${muted}`}>Updated {lastRefreshed}</p>}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {[
                  { title: "Pending Users", subtitle: `${pendingUsers.length} waiting for approval`, query: pendingQuery, setQuery: setPendingQuery, list: pendingUsers, isPending: true },
                  { title: "Approved Users", subtitle: `${approvedUsers.length} active`, query: approvedQuery, setQuery: setApprovedQuery, list: approvedUsers, isPending: false },
                ].map(({ title, subtitle, query, setQuery, list, isPending }) => (
                  <div key={title} className={`${sectionCard} overflow-hidden`}>
                    <div className={`px-5 py-4 border-b ${divider} flex items-center justify-between gap-3`}>
                      <div>
                        <h2 className="text-base font-semibold">{title}</h2>
                        <p className={`text-xs mt-0.5 ${muted}`}>{subtitle}</p>
                      </div>
                      <SearchBox value={query} onChange={setQuery} placeholder="Search…" />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[440px]">
                        <THead cols={["#", "Email", "Role", "Actions"]} />
                        <tbody className={`divide-y text-sm ${tableDivide}`}>
                          {list.filter(u => { const q = query.toLowerCase(); return !q || u.email.toLowerCase().includes(q) || (u.role || "").toLowerCase().includes(q); }).length === 0
                            ? <EmptyRow cols={4} msg={`No ${isPending ? "pending" : "approved"} users`} />
                            : list.filter(u => { const q = query.toLowerCase(); return !q || u.email.toLowerCase().includes(q) || (u.role || "").toLowerCase().includes(q); }).map(u => (
                              <tr key={u.id} className={`transition-colors ${tableRowHover}`}>
                                <td className={`px-5 py-3 text-xs ${muted}`}>#{u.id}</td>
                                <td className="px-5 py-3 font-medium">{u.email}</td>
                                <td className="px-5 py-3"><RoleBadge role={u.role} /></td>
                                <td className="px-5 py-3 text-right">
                                  <div className="inline-flex gap-1.5">
                                    {isPending && (
                                      <button onClick={() => handleAction(u.id, "approve")}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition bg-accentGreen text-black hover:brightness-95">
                                        <Check size={12} />Approve
                                      </button>
                                    )}
                                    <button onClick={() => handleAction(u.id, "reject")}
                                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${isDark ? "bg-red-500/15 text-red-400 hover:bg-red-500/25" : "bg-red-100 text-red-700 hover:bg-red-200"}`}>
                                      {isPending ? <X size={12} /> : <Trash2 size={12} />}{isPending ? "Reject" : "Remove"}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {isPending && (
                      <div className={`px-5 py-4 border-t ${divider}`}>
                        <h3 className="text-sm font-semibold">Pending Emails</h3>
                        <p className={`text-xs mt-0.5 ${muted}`}>
                          Quick view of accounts waiting for approval.
                        </p>
                        <div className="mt-3 max-h-40 overflow-y-auto space-y-1.5">
                          {list
                            .filter((u) => {
                              const q = query.toLowerCase();
                              return (
                                !q ||
                                u.email.toLowerCase().includes(q) ||
                                (u.role || "").toLowerCase().includes(q)
                              );
                            })
                            .map((u) => (
                              <div
                                key={`pending-email-${u.id}`}
                                className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                                  isDark
                                    ? "border-white/10 bg-zinc-800/40 text-zinc-200"
                                    : "border-gray-200 bg-gray-50 text-gray-700"
                                }`}
                              >
                                {u.email}
                              </div>
                            ))}
                          {list.filter((u) => {
                            const q = query.toLowerCase();
                            return (
                              !q ||
                              u.email.toLowerCase().includes(q) ||
                              (u.role || "").toLowerCase().includes(q)
                            );
                          }).length === 0 && (
                            <p className={`text-xs italic ${muted}`}>No pending emails to show.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════ COURSES ════ */}
          {activeTab === "courses" && (
            <div className="space-y-4">
              <div className={`${sectionCard} p-6`}>
                <h2 className="text-base font-semibold mb-4">{editingCourseId ? "Edit Course" : "New Course"}</h2>
                <form onSubmit={handleSaveCourse} className="space-y-3 max-w-2xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${muted}`}>Title</label>
                      <input required value={courseTitle} onChange={e => setCourseTitle(e.target.value)} className={inputCls} placeholder="Course title" />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${muted}`}>Topic</label>
                      <input required value={courseTopic} onChange={e => setCourseTopic(e.target.value)} className={inputCls} placeholder="e.g. Spreadsheet" />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${muted}`}>Description</label>
                    <textarea required value={courseContent} onChange={e => setCourseContent(e.target.value)} rows={3} className={`${inputCls} resize-none`} placeholder="Course description…" />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${muted}`}>
                      Thumbnail {editingCourseId && <span className={`font-normal ${muted}`}>(leave empty to keep)</span>}
                    </label>
                    <input type="file" accept="image/*" onChange={e => setCourseThumbnail(e.target.files?.[0] || null)}
                      className={`w-full text-sm rounded-xl border transition-colors ${isDark ? "bg-zinc-800/60 border-white/10 file:bg-zinc-700 file:text-zinc-300 file:border-0 file:px-3 file:py-2 file:mr-3 file:rounded-lg" : "bg-gray-50 border-gray-200 file:bg-gray-200 file:text-gray-600 file:border-0 file:px-3 file:py-2 file:mr-3 file:rounded-lg"}`} />
                  </div>
                  <MsgBanner msg={courseMsg} />
                  <div className="flex gap-2 pt-1">
                    <button disabled={creatingCourse} type="submit"
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition hover:brightness-95 disabled:opacity-50 ${isDark ? "bg-accentGreen text-black" : "bg-brandGreen text-white"}`}>
                      {creatingCourse ? <RefreshCw size={14} className="animate-spin" /> : (editingCourseId ? <Check size={14} /> : <Plus size={14} />)}
                      {editingCourseId ? "Update Course" : "Publish Course"}
                    </button>
                    {editingCourseId && (
                      <button type="button" onClick={cancelCourseEdit}
                        className={`px-5 py-2.5 rounded-full text-sm font-bold transition ${isDark ? "bg-zinc-800 hover:bg-zinc-700 text-white" : "bg-gray-200 hover:bg-gray-300 text-black"}`}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className={`${sectionCard} overflow-hidden`}>
                <div className={`px-5 py-4 border-b ${divider}`}>
                  <h2 className="text-base font-semibold">All Courses <span className={`font-normal text-sm ${muted}`}>({coursesList.length})</span></h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <THead cols={["#", "Title", "Topic", "Actions"]} />
                    <tbody className={`divide-y text-sm ${tableDivide}`}>
                      {coursesList.length === 0 ? <EmptyRow cols={4} msg="No courses yet" /> : coursesList.map(c => (
                        <tr key={c.id} className={`transition-colors ${tableRowHover}`}>
                          <td className={`px-5 py-3 text-xs ${muted}`}>#{c.id}</td>
                          <td className="px-5 py-3 font-medium">{c.title}</td>
                          <td className={`px-5 py-3 ${muted}`}>{c.topic}</td>
                          <td className="px-5 py-3 text-right">
                            <div className="inline-flex gap-1.5">
                              <button onClick={() => handleStartEditCourse(c)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${isDark ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}><Pencil size={12} />Edit</button>
                              <button onClick={() => handleDeleteCourse(c.id)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${isDark ? "bg-red-500/15 text-red-400 hover:bg-red-500/25" : "bg-red-100 text-red-700 hover:bg-red-200"}`}><Trash2 size={12} />Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ════ QUIZZES ════ */}
          {activeTab === "quizzes" && (
            <div className="space-y-4">
              <div className={`${sectionCard} p-6`}>
                <h2 className="text-base font-semibold mb-4">{editingQuizId ? "Edit Quiz" : "New Quiz"}</h2>
                <form onSubmit={handleSaveQuiz} className="space-y-4 max-w-3xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${muted}`}>Quiz Title</label>
                      <input required value={quizTitle} onChange={e => setQuizTitle(e.target.value)} className={inputCls} placeholder="e.g. Module 1 Assessment" />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${muted}`}>Linked Course</label>
                      <select required value={quizLessonId} onChange={e => setQuizLessonId(e.target.value)} className={`${inputCls} appearance-none`}>
                        <option value="" disabled>Select a course</option>
                        {adminLessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className={`flex items-center justify-between pb-2 border-b ${divider}`}>
                      <h3 className="text-sm font-semibold">Questions <span className={`font-normal ${muted}`}>({questions.length})</span></h3>
                      <button type="button" onClick={addQuestion}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${isDark ? "bg-white/8 hover:bg-white/14 text-zinc-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
                        <Plus size={12} />Add Question
                      </button>
                    </div>
                    {questions.map((q, idx) => (
                      <div key={idx} className={`p-4 rounded-2xl border relative ${isDark ? "bg-zinc-800/40 border-white/8" : "bg-gray-50 border-gray-200"}`}>
                        {questions.length > 1 && (
                          <button type="button" onClick={() => removeQuestion(idx)} className="absolute top-3 right-3 p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition"><Trash2 size={14} /></button>
                        )}
                        <p className={`text-xs font-bold mb-2 ${muted}`}>Question {idx + 1}</p>
                        <input required value={q.question_text} onChange={e => updateQuestion(idx, "question_text", e.target.value)} className={`${inputCls} mb-3`} placeholder="Enter question…" />
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {(["option_a", "option_b", "option_c", "option_d"] as const).map((f, fi) => (
                            <div key={f}>
                              <label className={`block text-xs font-semibold mb-1 ${muted}`}>Option {["A","B","C","D"][fi]}</label>
                              <input required value={q[f]} onChange={e => updateQuestion(idx, f, e.target.value)} className={inputCls} placeholder={`Answer ${["A","B","C","D"][fi]}`} />
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <label className={`text-xs font-semibold ${isDark ? "text-accentGreen" : "text-brandGreen"}`}>Correct:</label>
                          <select value={q.correct_choice} onChange={e => updateQuestion(idx, "correct_choice", e.target.value)} className={`${inputCls} w-auto`}>
                            {["A","B","C","D"].map(o => <option key={o} value={o}>Option {o}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  <MsgBanner msg={quizMsg} />
                  <div className="flex gap-2">
                    <button disabled={creatingQuiz} type="submit"
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition hover:brightness-95 disabled:opacity-50 ${isDark ? "bg-accentGreen text-black" : "bg-brandGreen text-white"}`}>
                      {creatingQuiz ? <RefreshCw size={14} className="animate-spin" /> : (editingQuizId ? <Check size={14} /> : <Plus size={14} />)}
                      {editingQuizId ? "Update Quiz" : "Publish Quiz"}
                    </button>
                    {editingQuizId && (
                      <button type="button" onClick={cancelQuizEdit}
                        className={`px-5 py-2.5 rounded-full text-sm font-bold transition ${isDark ? "bg-zinc-800 hover:bg-zinc-700 text-white" : "bg-gray-200 hover:bg-gray-300 text-black"}`}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className={`${sectionCard} overflow-hidden`}>
                <div className={`px-5 py-4 border-b ${divider}`}>
                  <h2 className="text-base font-semibold">All Quizzes <span className={`font-normal text-sm ${muted}`}>({quizzesList.length})</span></h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <THead cols={["#", "Title", "Course", "Actions"]} />
                    <tbody className={`divide-y text-sm ${tableDivide}`}>
                      {quizzesList.length === 0 ? <EmptyRow cols={4} msg="No quizzes yet" /> : quizzesList.map(q => (
                        <tr key={q.id} className={`transition-colors ${tableRowHover}`}>
                          <td className={`px-5 py-3 text-xs ${muted}`}>#{q.id}</td>
                          <td className="px-5 py-3 font-medium">{q.title}</td>
                          <td className={`px-5 py-3 ${muted}`}>{adminLessons.find(l => l.id === q.lesson)?.title || `Lesson ID: ${q.lesson}`}</td>
                          <td className="px-5 py-3 text-right">
                            <div className="inline-flex gap-1.5">
                              <button onClick={() => handleStartEditQuiz(q)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${isDark ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}><Pencil size={12} />Edit</button>
                              <button onClick={() => handleDeleteQuiz(q.id)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${isDark ? "bg-red-500/15 text-red-400 hover:bg-red-500/25" : "bg-red-100 text-red-700 hover:bg-red-200"}`}><Trash2 size={12} />Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ════ TRACKING ════ */}
          {activeTab === "tracking" && (
            <div className="space-y-4">
              {selectedUser ? (
                <div className="space-y-4">
                  {/* back + title */}
                  <div className="flex items-center gap-2.5">
                    <button onClick={() => setSelectedUser(null)}
                      className={`flex items-center gap-1 text-sm font-medium transition ${isDark ? "text-zinc-400 hover:text-white" : "text-gray-500 hover:text-black"}`}>
                      <ChevronLeft size={15} />Back
                    </button>
                    <span className={muted}>·</span>
                    <h2 className="text-base font-semibold">{selectedUser.email}</h2>
                    <RoleBadge role={selectedUser.role} />
                    <span className={`text-xs ${muted}`}>#{selectedUser.id}</span>
                  </div>

                  {/* 4 summary stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Pre-Assessment", value: selectedUser.stats?.pre_assessment ? `${selectedUser.stats.pre_assessment.score}%` : "—", sub: selectedUser.stats?.pre_assessment ? new Date(selectedUser.stats.pre_assessment.completed_at).toLocaleDateString() : "Not completed" },
                      { label: "Latest Quiz", value: selectedUser.stats?.quiz_history?.[0] ? `${selectedUser.stats.quiz_history[0].score}%` : "—", sub: selectedUser.stats?.quiz_history?.[0]?.quiz_title || "No attempts yet" },
                      { label: "Quizzes Taken", value: selectedUser.stats?.quiz_history?.length ?? 0, sub: "total attempts" },
                      { label: "Lessons Done", value: selectedUser.stats?.lesson_progress?.filter(l => l.completed).length ?? 0, sub: `of ${selectedUser.stats?.lesson_progress?.length ?? 0} total` },
                    ].map(({ label, value, sub }) => (
                      <div key={label} className={`${sectionCard} p-4`}>
                        <p className={`text-xs font-medium ${muted}`}>{label}</p>
                        <p className={`text-2xl font-bold mt-1 ${isDark ? "text-accentGreen" : "text-brandGreen"}`}>{value}</p>
                        <p className={`text-xs mt-1 truncate ${muted}`}>{sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* lesson progress by topic */}
                  <div className={`${sectionCard} p-5`}>
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen size={15} className={muted} />
                      <h3 className="text-base font-semibold">Lesson Progress by Topic</h3>
                    </div>
                    {selectedUser.stats?.lesson_progress?.length ? (() => {
                      const grouped = new Map<string, typeof selectedUser.stats.lesson_progress>();
                      for (const l of selectedUser.stats!.lesson_progress) {
                        const t = (l as any).topic || "General";
                        grouped.set(t, [...(grouped.get(t) ?? []), l]);
                      }
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Array.from(grouped.entries()).map(([topic, lessons]) => {
                            const done = lessons.filter(l => l.completed).length;
                            const pct = Math.round(lessons.reduce((s, l) => s + l.progress, 0) / lessons.length);
                            return (
                              <div key={topic} className={`rounded-xl border overflow-hidden ${isDark ? "border-white/8 bg-zinc-800/30" : "border-gray-200 bg-gray-50"}`}>
                                <div className={`px-4 py-3 flex items-center justify-between border-b ${isDark ? "border-white/8" : "border-gray-200"}`}>
                                  <div>
                                    <p className="text-sm font-semibold">{topic}</p>
                                    <p className={`text-xs mt-0.5 ${muted}`}>{done}/{lessons.length} completed</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className={`h-1.5 w-16 rounded-full overflow-hidden ${isDark ? "bg-zinc-700" : "bg-gray-200"}`}>
                                      <div className={`h-full rounded-full ${isDark ? "bg-accentGreen" : "bg-brandGreen"}`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className={`text-xs font-bold w-8 text-right ${isDark ? "text-zinc-300" : "text-gray-600"}`}>{pct}%</span>
                                  </div>
                                </div>
                                <div className={`divide-y ${tableDivide}`}>
                                  {lessons.map((l, i) => (
                                    <div key={i} className="flex items-center justify-between px-4 py-2.5">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${l.completed ? (isDark ? "bg-accentGreen" : "bg-brandGreen") : (isDark ? "bg-zinc-600" : "bg-gray-300")}`} />
                                        <span className={`text-xs truncate ${isDark ? "text-zinc-300" : "text-gray-700"}`}>{l.title}</span>
                                      </div>
                                      <span className={`text-xs font-medium shrink-0 ml-2 ${l.completed ? (isDark ? "text-accentGreen" : "text-brandGreen") : muted}`}>
                                        {l.completed ? "Complete" : "—"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })() : <p className={`text-sm italic ${muted}`}>No lesson progress found.</p>}
                  </div>

                  {/* quiz history */}
                  <div className={`${sectionCard} overflow-hidden`}>
                    <div className={`px-5 py-4 border-b ${divider}`}>
                      <h3 className="text-base font-semibold">Full Quiz History</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[440px]">
                        <thead>
                          <tr className={`text-xs uppercase tracking-wider ${isDark ? "bg-black/25 text-zinc-500" : "bg-gray-50 text-gray-400"}`}>
                            <th className="px-5 py-3 font-medium">Quiz</th>
                            <th className="px-5 py-3 font-medium">Score</th>
                            <th className="px-5 py-3 font-medium">Accuracy</th>
                            <th className="px-5 py-3 font-medium">Date</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y text-sm ${tableDivide}`}>
                          {selectedUser.stats?.quiz_history?.length
                            ? selectedUser.stats.quiz_history.map((q, i) => (
                              <tr key={i} className={`transition-colors ${tableRowHover}`}>
                                <td className="px-5 py-3 font-medium">{q.quiz_title}</td>
                                <td className={`px-5 py-3 font-bold ${q.score >= 75 ? (isDark ? "text-accentGreen" : "text-brandGreen") : "text-yellow-500"}`}>{q.score}%</td>
                                <td className={`px-5 py-3 ${muted}`}>{q.correct_count}/{q.total_questions} correct</td>
                                <td className={`px-5 py-3 ${muted}`}>{new Date(q.date).toLocaleDateString()}</td>
                              </tr>
                            ))
                            : <EmptyRow cols={4} msg="No quiz history" />}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`${sectionCard} overflow-hidden`}>
                  <div className={`px-5 py-4 border-b ${divider} flex items-center justify-between gap-3`}>
                    <div>
                      <h2 className="text-base font-semibold">Track a User</h2>
                      <p className={`text-xs mt-0.5 ${muted}`}>Click any row to view detailed progress</p>
                    </div>
                    <SearchBox value={trackingQuery} onChange={setTrackingQuery} placeholder="Search users…" />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[440px]">
                      <THead cols={["#", "Email", "Role", ""]} />
                      <tbody className={`divide-y text-sm ${tableDivide}`}>
                        {approvedUsers.filter(u => { const q = trackingQuery.toLowerCase(); return !q || u.email.toLowerCase().includes(q) || (u.role || "").toLowerCase().includes(q); }).length === 0
                          ? <EmptyRow cols={4} msg="No users to track" />
                          : approvedUsers.filter(u => { const q = trackingQuery.toLowerCase(); return !q || u.email.toLowerCase().includes(q) || (u.role || "").toLowerCase().includes(q); }).map(u => (
                            <tr key={u.id} onClick={() => fetchUserDetails(u)} className={`cursor-pointer group transition-colors ${tableRowHover}`}>
                              <td className={`px-5 py-3 text-xs ${muted}`}>#{u.id}</td>
                              <td className={`px-5 py-3 font-medium transition-colors ${isDark ? "group-hover:text-accentGreen" : "group-hover:text-brandGreen"}`}>{u.email}</td>
                              <td className="px-5 py-3"><RoleBadge role={u.role} /></td>
                              <td className="px-5 py-3 text-right">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${isDark ? "text-accentGreen bg-accentGreen/10 group-hover:bg-accentGreen/20" : "text-brandGreen bg-brandGreen/10 group-hover:bg-brandGreen/20"}`}>
                                  <BarChart3 size={12} />View Stats
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ SETTINGS (NEW TAB) ════ */}
          {activeTab === "settings" && (
            <div className="space-y-4">
              <div className={`${sectionCard} p-6 max-w-2xl`}>
                <h2 className="text-base font-semibold mb-5">Site Settings</h2>
                
                <div className={`flex items-center justify-between p-5 border rounded-2xl ${isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"}`}>
                  <div>
                    <h3 className="font-semibold text-sm">Maintenance Banner</h3>
                    <p className={`text-xs mt-1 ${muted}`}>Show the scrolling warning banner across all pages.</p>
                  </div>
                  
                  {/* The Toggle Switch */}
                  <button 
                    onClick={handleToggleBanner} 
                    className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${showBanner ? (isDark ? "bg-accentGreen" : "bg-brandGreen") : (isDark ? "bg-zinc-700" : "bg-gray-300")}`}
                  >
                    <span 
                      className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${showBanner ? "translate-x-6" : "translate-x-0"}`} 
                    />
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}