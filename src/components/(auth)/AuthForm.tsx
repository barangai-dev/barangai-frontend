"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";
import { BackgroundPaths } from "@/components/ui/paths";

const easeOut = [0.22, 1, 0.36, 1] as const;
const springTab = { type: "spring" as const, stiffness: 400, damping: 35 };
const INTRO_SPLASH_MS = 1000;
/** Fixed height for login vs signup body so switching does not resize; no inner scroll. */
const FORM_BODY_SLOT_CLASS = "relative h-[100px] w-full sm:h-[280px] overflow-hidden";

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getFriendlyAuthError(err: any, fallback: string): string {
  const rawMessage =
    err?.message ||
    err?.detail ||
    err?.error ||
    (typeof err === "string" ? err : "") ||
    fallback;

  const normalized = String(rawMessage).toLowerCase();

  if (
    normalized.includes("already exists") ||
    normalized.includes("already registered") ||
    normalized.includes("email exists") ||
    normalized.includes("unique") ||
    normalized.includes("duplicate")
  ) {
    return "Email already exists.";
  }

  return String(rawMessage || fallback);
}

const formVariants = {
  initial: (dir: number) => ({
    opacity: 0,
    x: dir * 16,
  }),
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.32, ease: easeOut },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir * -12,
    transition: { duration: 0.22, ease: easeOut },
  }),
};

export default function AuthForm() {
  const [introDone, setIntroDone] = useState(false);

  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [direction, setDirection] = useState(1);

  const setModeWithDirection = (next: "login" | "signup" | "forgot") => {
    // If going to forgot, always slide forward. If returning to login, slide backward.
    if (next === "forgot") setDirection(1);
    else if (mode === "forgot" && next === "login") setDirection(-1);
    else setDirection(next === "signup" ? 1 : -1);
    
    setMode(next);
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sEmail, setSEmail] = useState("");
  const [sPassword, setSPassword] = useState("");
  const [sConfirm, setSConfirm] = useState("");
  const [sRole, setSRole] = useState<string>("CAPTAIN");
  const [sFirstName, setSFirstName] = useState<string>("");
  const [sLastName, setSLastName] = useState<string>("");

  const router = useRouter();
  const auth = useAuth();
  
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  const inputClass =
    isDark
      ? "w-full py-1.5 px-2 rounded-md border border-white/10 bg-white/5 text-[13px] outline-none transition focus:border-accentGreen/60 focus:ring-1 focus:ring-accentGreen/25"
      : "w-full py-1.5 px-2 rounded-md border border-gray-200 bg-white text-[13px] outline-none transition focus:border-black/25 focus:ring-1 focus:ring-black/10";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      try { document.body.removeChild(script); } catch (e) {}
    };
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setIntroDone(true), INTRO_SPLASH_MS);
    return () => window.clearTimeout(t);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await auth.login(email, password, firstName, lastName);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (sPassword !== sConfirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await auth.signup(sEmail, sPassword, sFirstName, sLastName, sRole);
      setMode("login");
    } catch (err: any) {
      setError(getFriendlyAuthError(err, "Signup failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Use your actual Railway backend URL
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const res = await fetch(`${API_URL}accounts/password-reset/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setError("Success! Check your email for the reset link.");
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (err: any) {
      setError("Network error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialResponse = async (response: any) => {
    const id_token = response?.credential;
    if (!id_token) {
      setError("Google sign-in failed: no credential.");
      return;
    }

    const tokenClaims = decodeJwtPayload(id_token);

    setLoading(true);
    setError(null);
    try {

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://barangaibackend-production.up.railway.app/";
      const baseUrl = API_BASE.endsWith('/') ? API_BASE : `${API_BASE}/`;
      
      // Send the token to the GoogleLoginView in your Django code
      const res = await fetch(`${baseUrl}accounts/google-login/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token }),
      });
      const data = await res.json();

      if (!res.ok) {
        const apiMessage = String(data?.error || data?.detail || "").toLowerCase();
        const isApprovalPending =
          res.status === 403 &&
          (apiMessage.includes("approval") ||
            apiMessage.includes("approved") ||
            apiMessage.includes("pending") ||
            apiMessage.includes("not approved"));

        if (isApprovalPending) {
          const emailForWaitScreen =
            data?.user?.email ||
            tokenClaims?.email ||
            "";
          const waitUrl = emailForWaitScreen
            ? `/pending-approval?email=${encodeURIComponent(emailForWaitScreen)}`
            : "/pending-approval";
          router.push(waitUrl);
          return;
        }

        setError(data.error || data.detail || "Google login failed");
        return;
      }

      // Fail-closed approval gate for Google flow.
      // If backend does not explicitly mark the user approved, send to waiting screen.
      const googleApproved = data?.user?.is_approved === true;
      if (!googleApproved) {
        const emailForWaitScreen =
          data?.user?.email ||
          tokenClaims?.email ||
          "";
        const waitUrl = emailForWaitScreen
          ? `/pending-approval?email=${encodeURIComponent(emailForWaitScreen)}`
          : "/pending-approval";
        router.push(waitUrl);
        return;
      }

      if ((auth as any)?.loginWithTokens) {
        await (auth as any).loginWithTokens(data.access, data.refresh, { ...(tokenClaims ?? {}), ...(data.user ?? {}) });
      } else if ((auth as any)?.setTokens) {
        (auth as any).setTokens(data.access, data.refresh);
        if ((auth as any).setUser && data.user) (auth as any).setUser(data.user);
      } else {
        localStorage.setItem("access_token", data.access);
        localStorage.setItem("refresh_token", data.refresh);
        localStorage.setItem("user_id", data.user.id.toString());
        localStorage.setItem("user_email", data.user.email);
        localStorage.setItem("user_role", data.user.role);
        localStorage.setItem("first_name", data.user.first_name || tokenClaims?.given_name || "");
        localStorage.setItem("last_name", data.user.last_name || tokenClaims?.family_name || "");
        if (data.user.avatar_url || tokenClaims?.picture) localStorage.setItem("user_avatar", data.user.avatar_url || tokenClaims?.picture);
      }

      router.push("/dashboard");
    } catch (err) {
      setError("Network error during Google login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!introDone || typeof window === "undefined") return;

    const renderButton = () => {
      if ((window as any).google && (window as any).google.accounts) {
        (window as any).google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID",
          callback: handleCredentialResponse,
        });

        (window as any).google.accounts.id.renderButton(
          document.getElementById("googleSignInDiv"),
          { 
            theme: isDark ? "filled_black" : "outline", 
            size: "large",
            shape: "pill",
            text: "continue_with"
          }
        );
      }
    };

    if ((window as any).google) {
      renderButton();
    } else {
      const interval = setInterval(() => {
        if ((window as any).google) {
          renderButton();
          clearInterval(interval);
        }
      }, 100);
      setTimeout(() => clearInterval(interval), 5000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introDone, isDark]);

  const heroCopy = (
    <>
      <p 
        className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accentGreen/95 mb-1.5"
        style={{ fontFamily: "'Poppins', 'Plus Jakarta Sans', sans-serif" }}
      >
        WELCOME TO BARANGAI
      </p>
      <div 
        className="text-lg md:text-xl font-bold mb-2"
        style={{ fontFamily: "'Poppins', 'Plus Jakarta Sans', sans-serif" }}
      >
        Barang<span className="text-accentGreen">AI</span>
      </div>
      <h2 className="text-base md:text-lg font-extrabold leading-snug mb-1.5">
        Adaptive system. Faster learning. Help with AI.
      </h2>
      <p className="text-xs md:text-sm opacity-80 leading-relaxed max-w-md">
        From one-time seminars and long Google searches to work that could have been easier—everything you need to learn, adapt, and get assistance in one place.
      </p>
    </>
  );

  const mobileHeroStrip = (
    <div className="md:hidden text-center text-white mb-2 px-1">
      <p 
        className="text-[9px] font-semibold uppercase tracking-[0.2em] text-accentGreen/90"
        style={{ fontFamily: "'Poppins', 'Plus Jakarta Sans', sans-serif" }}
      >
        WELCOME TO BARANGAI
      </p>
      <p 
        className="text-sm font-bold"
        style={{ fontFamily: "'Poppins', 'Plus Jakarta Sans', sans-serif" }}
      >
        Barang<span className="text-accentGreen">AI</span>
        <span className="font-normal text-white/75 text-xs"> · Adaptive learning and AI help</span>
      </p>
    </div>
  );

  return (
    <BackgroundPaths>
      <LayoutGroup id="auth-intro">
        <AnimatePresence mode="popLayout">
          {!introDone && (
            <motion.div
              key="splash"
              layoutId="welcome-shell"
              className="fixed inset-0 z-[60] flex items-center justify-center px-6 bg-black/50 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-center">
                <motion.h1
                  className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight"
                  style={{ fontFamily: "'Poppins', 'Plus Jakarta Sans', sans-serif" }}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, y: -12 }}
                  transition={{ duration: 0.35, ease: easeOut }}
                >
                  WELCOME TO <span className="text-accentGreen">BARANGAI</span>
                </motion.h1>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {introDone && (
          <>
            {/* TOP LEFT CONTROLS (Back to Dashboard) */}
            <motion.div
              className="absolute top-4 left-4 md:top-6 md:left-8 z-50 flex items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, ease: easeOut }}
            >
              {/* Back to Dashboard Button */}
              <button
                onClick={() => router.push("/")}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border shadow-sm backdrop-blur-md ${
                  isDark 
                    ? "bg-accentGreen/95 border-white/10 text-black/80 hover:bg-white/10 hover:text-white" 
                    : "bg-accentGreen/95 border-black/10 text-black/80 hover:bg-white hover:text-black"
                }`}
              >
                <svg className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Dashboard
              </button>
            </motion.div>

            {/* TOP RIGHT CONTROLS (Theme Toggle) */}
            <motion.div
              className="absolute top-4 right-4 md:top-6 md:right-8 z-50 flex items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, ease: easeOut }}
            >
              {/* Theme Toggle */}
              <button
                aria-label="Toggle theme"
                onClick={toggle}
                className="group inline-flex items-center gap-2 rounded-full px-2 py-1 transition"
                title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
                <span
                  className={`relative inline-flex h-9 w-20 items-center rounded-full border px-1 transition ${
                    isDark
                      ? "border-[#2f3a2f] bg-[#034440]"
                      : "border-[#7fb85a] bg-[#9DE16A]"
                  }`}
                >
                  <span
                    className={`h-7 w-7 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.2)] transition-transform duration-300 ${
                      isDark ? "translate-x-10 bg-[#9DE16A]" : "translate-x-0 bg-white"
                    }`}
                  />
                  <span className="pointer-events-none absolute right-4 top-2 h-1.5 w-1.5 rounded-full bg-white/80" />
                  <span className="pointer-events-none absolute right-2.5 top-4 h-1.5 w-1.5 rounded-full bg-white/60" />
                </span>
              </button>
            </motion.div>

            <motion.div
              className="min-h-[100dvh] flex items-center justify-center relative z-10 px-3 py-4 md:px-4 md:py-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, ease: easeOut }}
            >
              <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-6 items-start">
                {mobileHeroStrip}
                {/* Hero — desktop only, no card */}
                <div className="hidden md:flex md:col-span-6 flex-col justify-center text-white px-1 md:pr-4 pt-0">
                  <motion.div
                    layoutId="welcome-shell"
                    className="rounded-none border-0 bg-transparent p-0 md:py-1 text-left"
                    transition={{ type: "spring", stiffness: 320, damping: 34 }}
                  >
                    {heroCopy}
                  </motion.div>
                </div>

                {/* Form — compact */}
                <div className="md:col-span-6 w-full max-w-md mx-auto md:max-w-none md:mx-0">
                  <div
                    className={`w-full rounded-xl p-4 md:p-5 shadow-lg border flex flex-col transition-colors ${isDark ? "bg-black/80 text-white border-white/10" : "bg-white text-black border-black/[0.06]"}`}
                  >
                    <div className="flex flex-col gap-3 mb-3">
                      <AnimatePresence mode="wait">
                        <motion.h2
                          key={mode}
                          className="text-lg font-bold tracking-tight"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.2, ease: easeOut }}
                        >
                          {mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password"}
                        </motion.h2>
                      </AnimatePresence>

                      {/* TABS - Only show if not in 'forgot' mode */}
                      {mode !== "forgot" && (
                        <div
                          className={`relative flex rounded-full p-0.5 ${isDark ? "bg-white/[0.08]" : "bg-black/[0.06]"}`}
                          role="tablist"
                          aria-label="Authentication mode"
                        >
                          <motion.div
                            className="absolute top-0.5 bottom-0.5 z-0 rounded-full bg-accentGreen shadow-sm shadow-accentGreen/20"
                            layout
                            transition={springTab}
                            style={{
                              width: "calc(50% - 3px)",
                              left: mode === "login" ? 3 : "calc(50% + 0px)",
                            }}
                          />
                          <button
                            type="button"
                            role="tab"
                            aria-selected={mode === "login"}
                            onClick={() => setModeWithDirection("login")}
                            className={`relative z-10 flex-1 py-2 text-xs font-semibold rounded-full transition-colors ${
                              mode === "login" ? "text-black" : isDark ? "text-white/65" : "text-black/55"
                            }`}
                          >
                            Login
                          </button>
                          <button
                            type="button"
                            role="tab"
                            aria-selected={mode === "signup"}
                            onClick={() => setModeWithDirection("signup")}
                            className={`relative z-10 flex-1 py-2 text-xs font-semibold rounded-full transition-colors ${
                              mode === "signup" ? "text-black" : isDark ? "text-white/65" : "text-black/55"
                            }`}
                          >
                            Sign Up
                          </button>
                        </div>
                      )}
                    </div>

                    <div className={FORM_BODY_SLOT_CLASS}>
                      <AnimatePresence mode="wait" custom={direction}>
                        {mode === "login" ? (
                          <motion.form
                            key="login"
                            custom={direction}
                            variants={formVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            onSubmit={handleLogin}
                            className="absolute inset-0 flex h-full min-h-0 flex-col gap-0"
                          >
                            <div className="space-y-1.5 shrink-0">
                              <div>
                                <label className="block text-[10px] font-medium uppercase tracking-wide mb-0 opacity-90">Email</label>
                                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                              </div>
                              <div>
                                <label className="block text-[10px] font-medium uppercase tracking-wide mb-0 opacity-90">Password</label>
                                <input
                                  type="password"
                                  required
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  className={inputClass}
                                />
                              </div>
                              <div className="flex items-center justify-between gap-2 pt-0.5 text-[10px]">
                                <label className="flex items-center gap-1.5 opacity-80 shrink-0">
                                  <input type="checkbox" className="accent-[#9DE16A] rounded" />
                                  Remember
                                </label>
                                <button type="button" onClick={() => setModeWithDirection("forgot")} className="hover:underline opacity-80 text-right truncate">
                                  Forgot password?
                                </button>
                              </div>
                              <div className="min-h-[2.25rem]">
                                {error && (
                                  <p className={`text-[11px] leading-snug ${isDark ? "text-red-300" : "text-red-600"}`}>{error}</p>
                                )}
                              </div>
                            </div>
                            <div className="min-h-0 flex-1" aria-hidden />
                            <motion.button
                              type="submit"
                              className={
                                isDark
                                  ? "mt-auto w-full shrink-0 py-2 rounded-full bg-accentGreen text-black text-sm font-semibold"
                                  : "mt-auto w-full shrink-0 py-2 rounded-full bg-black text-white text-sm font-semibold"
                              }
                              disabled={loading}
                              whileHover={{ scale: loading ? 1 : 1.01 }}
                              whileTap={{ scale: loading ? 1 : 0.99 }}
                            >
                              {loading ? "Signing in..." : "Login"}
                            </motion.button>
                          </motion.form>
                        ) : mode === "signup" ? (
                          <motion.form
                            key="signup"
                            custom={direction}
                            variants={formVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            onSubmit={handleSignup}
                            className="absolute inset-0 flex h-full min-h-0 flex-col gap-0"
                          >
                            <div className="flex min-h-0 flex-1 flex-col space-y-1.5">
                              <div>
                                <label className="block text-[10px] font-medium uppercase tracking-wide mb-0 opacity-90">Email</label>
                                <input type="email" required value={sEmail} onChange={(e) => setSEmail(e.target.value)} className={inputClass} />
                              </div>
                              <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                  <label className="block text-[10px] font-medium uppercase tracking-wide mb-0 opacity-90">First name</label>
                                  <input
                                    type="text"
                                    required
                                    value={sFirstName}
                                    onChange={(e) => setSFirstName(e.target.value)}
                                    className={inputClass}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-medium uppercase tracking-wide mb-0 opacity-90">Last name</label>
                                  <input
                                    type="text"
                                    required
                                    value={sLastName}
                                    onChange={(e) => setSLastName(e.target.value)}
                                    className={inputClass}
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                  <label className="block text-[10px] font-medium uppercase tracking-wide mb-0 opacity-90">Password</label>
                                  <input
                                    type="password"
                                    required
                                    value={sPassword}
                                    onChange={(e) => setSPassword(e.target.value)}
                                    className={inputClass}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-medium uppercase tracking-wide mb-0 opacity-90">Confirm</label>
                                  <input
                                    type="password"
                                    required
                                    value={sConfirm}
                                    onChange={(e) => setSConfirm(e.target.value)}
                                    className={inputClass}
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] font-medium uppercase tracking-wide mb-0 opacity-90">Role</label>
                                <select value={sRole} onChange={(e) => setSRole(e.target.value)} className={inputClass}>
                                  <option value="CAPTAIN">Barangay Captain</option>
                                  <option value="COUNCILOR">Barangay Councilor</option>
                                  <option value="SECRETARY">Barangay Secretary</option>
                                  <option value="TREASURER">Barangay Treasurer</option>
                                  <option value="KAGAWAD">Barangay Kagawad</option>
                                  <option value="ENCODER">Barangay Encoder</option>
                                  <option value="OFFICIAL">Barangay Official</option>
                                </select>
                              </div>
                              <div className="min-h-[2.25rem] shrink-0">
                                {error && (
                                  <p className={`text-[11px] leading-snug ${isDark ? "text-red-300" : "text-red-600"}`}>{error}</p>
                                )}
                              </div>
                            </div>
                            <motion.button
                              type="submit"
                              className={
                                isDark
                                  ? "mt-auto w-full shrink-0 py-2 rounded-full bg-accentGreen text-black text-sm font-semibold"
                                  : "mt-auto w-full shrink-0 py-2 rounded-full bg-black text-white text-sm font-semibold"
                              }
                              disabled={loading}
                              whileHover={{ scale: loading ? 1 : 1.01 }}
                              whileTap={{ scale: loading ? 1 : 0.99 }}
                            >
                              {loading ? "Creating..." : "Sign Up"}
                            </motion.button>
                          </motion.form>
                        ) : (
                          <motion.form
                            key="forgot"
                            custom={direction}
                            variants={formVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            onSubmit={handleForgotPassword}
                            className="absolute inset-0 flex h-full min-h-0 flex-col gap-0"
                          >
                            <div className="space-y-1.5 shrink-0">
                              <p className={`text-[12px] leading-relaxed mb-3 opacity-90 ${isDark ? "text-zinc-300" : "text-slate-600"}`}>
                                Enter your email address and we will send you a link to reset your password.
                              </p>
                              <div>
                                <label className="block text-[10px] font-medium uppercase tracking-wide mb-0 opacity-90">Email</label>
                                <input 
                                  type="email" 
                                  required 
                                  value={email} 
                                  onChange={(e) => setEmail(e.target.value)} 
                                  className={inputClass} 
                                />
                              </div>
                              <div className="min-h-[2.25rem]">
                                {error && (
                                  <p className={`text-[11px] leading-snug ${isDark ? "text-accentGreen" : "text-[#034440]"}`}>{error}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="min-h-0 flex-1" aria-hidden />
                            
                            <div className="mt-auto shrink-0 flex flex-col gap-2">
                              <motion.button
                                type="submit"
                                className={
                                  isDark
                                    ? "w-full py-2 rounded-full bg-accentGreen text-black text-sm font-semibold"
                                    : "w-full py-2 rounded-full bg-black text-white text-sm font-semibold"
                                }
                                disabled={loading}
                                whileHover={{ scale: loading ? 1 : 1.01 }}
                                whileTap={{ scale: loading ? 1 : 0.99 }}
                              >
                                {loading ? "Sending..." : "Send Reset Link"}
                              </motion.button>
                              <button
                                type="button"
                                onClick={() => setModeWithDirection("login")}
                                className={`w-full py-1.5 text-xs font-semibold opacity-70 hover:opacity-100 transition-opacity ${isDark ? "text-white" : "text-black"}`}
                              >
                                Back to Login
                              </button>
                            </div>
                          </motion.form>
                        )}
                      </AnimatePresence>
                    </div>

                    {mode !== "forgot" && (
                      <div
                        className={`mt-3 pt-2 border-t text-center text-[11px] opacity-70 ${isDark ? "border-white/10" : "border-black/10"}`}
                      >
                        Or continue with
                        <div id="googleSignInDiv" className="mt-2 flex justify-center scale-90 origin-top" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </LayoutGroup>
    </BackgroundPaths>
  );
}