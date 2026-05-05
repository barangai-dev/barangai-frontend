"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useTheme } from "@/context/theme";
import { useAuth } from "@/context/auth";
import { BackgroundPaths } from "@/components/ui/paths";
import { API_BASE_URL, updateProfile } from "@/lib/auth";

const easeOut = [0.22, 1, 0.36, 1] as const;

// Helper to handle Django Media URLs vs Blob Previews
const getFullImageUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith("blob:") || path.startsWith("http")) return path;
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${base}${path}`;
};

const getAvatarPath = (data: any) => {
  return data?.avatar || data?.avatar_url || data?.photo || data?.picture || null;
};

export default function ProfilePage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const auth = useAuth();
  const isDark = theme === "dark";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [role, setRole] = useState("GUEST"); // Added role state

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Load user info
  useEffect(() => {
    const storedEmail = localStorage.getItem("user_email") || "";
    const storedAvatar = localStorage.getItem("user_avatar");
    const storedRole = localStorage.getItem("user_role") || "GUEST";
    const storedFirstName = localStorage.getItem("first_name") || "";
    const storedLastName = localStorage.getItem("last_name") || "";

    setUser({
      email: storedEmail,
      avatar: storedAvatar,
      role: storedRole,
      first_name: storedFirstName,
      last_name: storedLastName
    });

    setEmail(storedEmail);
    setFirstName(storedFirstName);
    setLastName(storedLastName);
    setRole(storedRole);
    if (storedAvatar) setPreview(getFullImageUrl(storedAvatar));
  }, [auth.user]);

  // Avatar preview logic
  useEffect(() => {
    if (!avatarFile) return;
    const url = URL.createObjectURL(avatarFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const inputClass = isDark
    ? "w-full py-2 px-3 rounded-xl border border-white/10 bg-white/5 text-[13px] outline-none transition focus:border-accentGreen/60 focus:ring-1 focus:ring-accentGreen/25"
    : "w-full py-2 px-3 rounded-xl border border-gray-200 bg-white text-[13px] outline-none transition focus:border-black/25 focus:ring-1 focus:ring-black/10";

  const selectClass = `${inputClass} appearance-none cursor-pointer ${
    isDark ? "text-white" : "text-black"
  }`;
  const optionClass = isDark ? "bg-[#0b1414] text-white" : "bg-white text-black";

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (password && password !== confirm) {
      setStatus({ type: "error", msg: "Passwords do not match." });
      return;
    }

    try {
      setLoading(true);
      const data = await updateProfile({
        email,
        password: password || undefined,
        avatarFile,
        first_name,
        last_name,
        role 
      });

      // Update LOCAL STORAGE
      const avatarPath = getAvatarPath(data);
      if (avatarPath) localStorage.setItem("user_avatar", avatarPath);
      if (data.email) localStorage.setItem("user_email", data.email);
      if (data.first_name) localStorage.setItem("first_name", data.first_name);
      if (data.last_name) localStorage.setItem("last_name", data.last_name);
      if (data.role) localStorage.setItem("user_role", data.role); // Update role in storage

      // Update LOCAL STATE
      setUser({ 
        ...user, 
        email: data.email || email, 
        avatar: avatarPath ?? user?.avatar,
        first_name: data.first_name || first_name,
        last_name: data.last_name || last_name,
        role: data.role || role
      });

      setEditMode(false);
      setPassword("");
      setConfirm("");
      setStatus({ type: "success", msg: "Profile updated successfully" });
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      setStatus({ type: "error", msg: err.message || "Update failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const user_id = localStorage.getItem("user_id");
      if (!token) throw new Error("Not authenticated");

      const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const res = await fetch(`${base}/accounts/users/${user_id}/delete/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Delete failed");

      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
    } catch (err: any) {
      setStatus({ type: "error", msg: err.message });
    }
  };

  // Helper function to format role text nicely
  const formatRole = (roleString: string) => {
    if (!roleString) return "Guest";
    if (roleString === "CAPTAIN") return "Barangay Captain";
    if (roleString === "COUNCILOR") return "Barangay Councilor";
    if (roleString === "SECRETARY") return "Barangay Secretary";
    if (roleString === "TREASURER") return "Barangay Treasurer";
    if (roleString === "KAGAWAD") return "Barangay Kagawad";
    if (roleString === "ENCODER") return "Barangay Encoder";
    if (roleString === "OFFICIAL") return "Barangay Official";
    return roleString.charAt(0).toUpperCase() + roleString.slice(1).toLowerCase();
  };

  return (
    <BackgroundPaths>
      <LayoutGroup id="profile-page">
        {/* TOP RIGHT CONTROLS */}
        <motion.div
          className="absolute top-4 right-4 md:top-6 md:right-8 z-50 flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: easeOut }}
        >
          <button
            onClick={() => router.push("/dashboard")}
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border shadow-sm backdrop-blur-md ${
              isDark 
                ? "bg-green-500/40 border-white/10 text-white/80 hover:bg-white/10 hover:text-white" 
                : "bg-green-500/60 border-black/10 text-black/70 hover:bg-white/40 hover:text-white"
            }`}
          >
            <svg className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </button>

          <button
            aria-label="Toggle theme"
            onClick={toggle}
            className="group inline-flex items-center gap-2 rounded-full px-2 py-1 transition"
          >
            <span
              className={`relative inline-flex h-9 w-20 items-center rounded-full border px-1 transition ${
                isDark ? "border-[#2f3a2f] bg-[#034440]" : "border-[#7fb85a] bg-[#9DE16A]"
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

        <div className="min-h-[100dvh] flex items-center justify-center relative z-10 px-4 py-12">
          <motion.div
            layout
            className={`w-full max-w-xl p-6 md:p-10 rounded-3xl shadow-2xl backdrop-blur-md border ${
              isDark ? "bg-black/80 text-white border-white/10" : "bg-white/90 text-black border-black/[0.06]"
            }`}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* STATUS MESSAGE */}
            <AnimatePresence>
              {status && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`mb-6 p-3 rounded-xl text-sm font-medium text-center ${
                    status.type === "success" 
                      ? "bg-accentGreen/20 text-[#034440] dark:text-accentGreen border border-accentGreen/30" 
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                  }`}
                >
                  {status.msg}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {!editMode ? (
                /* VIEW MODE */
                <motion.div
                  key="view-mode"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25, ease: easeOut }}
                  className="flex flex-col items-center"
                >
                  <div className="relative mb-6 group">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-accentGreen shadow-lg shadow-accentGreen/20 p-1 bg-white/5">
                      {user?.avatar || preview ? (
                        <Image
                          src={(preview || getFullImageUrl(user?.avatar)) as string}
                          alt="Avatar"
                          width={120}
                          height={120}
                          className="rounded-full w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-700 to-black flex items-center justify-center text-3xl text-white font-bold">
                          {(user?.first_name?.[0] || user?.email?.[0] || "U").toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  <h2 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: "'Poppins', 'Plus Jakarta Sans', sans-serif" }}>
                    {user?.first_name} {user?.last_name}
                  </h2>
                  <p className={`text-sm mt-1 mb-2 ${isDark ? "text-white/60" : "text-black/60"}`}>
                    {user?.email}
                  </p>
                  <span className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-accentGreen/20 text-accentGreen border border-accentGreen/30 mb-8">
                    {formatRole(user?.role)}
                  </span>

                  <div className="w-full flex flex-col gap-3 md:flex-row">
                    <motion.button
                      onClick={() => setEditMode(true)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex-1 py-3 rounded-full font-bold shadow-md ${
                        isDark ? "bg-white text-black" : "bg-black text-white"
                      }`}
                    >
                      Edit Profile
                    </motion.button>
                    <motion.button
                      onClick={() => setShowDeleteConfirm(true)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 py-3 rounded-full font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-colors"
                    >
                      Delete Account
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                /* EDIT MODE */
                <motion.form
                  key="edit-mode"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25, ease: easeOut }}
                  onSubmit={handleUpdate}
                  className="space-y-6"
                >
                  <div className="flex flex-col items-center mb-4">
                    <h2 className="text-2xl font-bold tracking-tight mb-6">Edit Profile</h2>
                    
                    {/* CLICKABLE AVATAR UPLOAD */}
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-dashed border-accentGreen p-1 bg-white/5 transition-transform group-hover:scale-105">
                        {preview || user?.avatar ? (
                          <Image
                            src={(preview || getFullImageUrl(user?.avatar)) as string}
                            alt="Avatar Preview"
                            width={112}
                            height={112}
                            className="rounded-full w-full h-full object-cover opacity-80 group-hover:opacity-50 transition-opacity"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center text-sm text-center px-2">
                            Upload
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <svg className="w-8 h-8 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-widest opacity-70">First Name</label>
                      <input type="text" value={first_name} onChange={(e) => setFirstName(e.target.value)} className={inputClass} placeholder="First Name" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-widest opacity-70">Last Name</label>
                      <input type="text" value={last_name} onChange={(e) => setLastName(e.target.value)} className={inputClass} placeholder="Last Name" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-widest opacity-70">Email Address</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="Email" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-widest opacity-70">Role</label>
                    <select 
                      value={role} 
                      onChange={(e) => setRole(e.target.value)} 
                      className={selectClass}
                    >
                      <option className={optionClass} value="CAPTAIN">Barangay Captain</option>
                      <option className={optionClass} value="SECRETARY">Barangay Secretary</option>
                      <option className={optionClass} value="TREASURER">Barangay Treasurer</option>
                      <option className={optionClass} value="KAGAWAD">Barangay Kagawad</option>
                      <option className={optionClass} value="ENCODER">Barangay Encoder</option>
                      <option className={optionClass} value="OFFICIAL">Other Barangay Official</option>
                      <option className={optionClass} value="GUEST">Guest</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-widest opacity-70">New Password</label>
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="Leave blank to keep current" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-widest opacity-70">Confirm Password</label>
                      <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} placeholder="Confirm new password" />
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col md:flex-row gap-3">
                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: loading ? 1 : 1.02 }}
                      whileTap={{ scale: loading ? 1 : 0.98 }}
                      className="flex-1 py-3 rounded-full bg-accentGreen text-black font-bold shadow-lg shadow-accentGreen/20 disabled:opacity-50"
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => { setEditMode(false); setStatus(null); }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex-1 py-3 rounded-full font-bold border ${isDark ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-black/5 border-black/10 hover:bg-black/10"}`}
                    >
                      Cancel
                    </motion.button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* DELETE CONFIRM MODAL (Animated) */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] px-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className={`p-8 rounded-3xl w-full max-w-sm space-y-6 shadow-2xl border ${isDark ? "bg-[#0b1414] border-white/10" : "bg-white border-black/10"}`}
              >
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="font-extrabold text-xl">Delete Account?</h3>
                  <p className="text-sm opacity-70 leading-relaxed">
                    This action is permanent and cannot be undone. Please enter your password to confirm.
                  </p>
                </div>
                
                <input
                  type="password"
                  placeholder="Your Password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className={inputClass}
                />

                <div className="flex flex-col gap-2">
                  <motion.button onClick={handleDelete} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-3 bg-red-600 text-white font-bold rounded-full shadow-lg shadow-red-600/20">
                    Yes, Delete My Account
                  </motion.button>
                  <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-3 font-semibold opacity-70 hover:opacity-100">
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </BackgroundPaths>
  );
}