import { API_BASE_URL } from "@/lib/auth";

export type SubmissionStatus = "MANUAL_REVIEW" | "PASSED" | "FAILED";
export type ActivityType = "TEXT" | "IMAGE";

export type ActivitySubmission = {
  id: number;
  user: number;
  activity: number;
  text_answer: string | null;
  image_answer: string | null;
  status: SubmissionStatus;
  submitted_at: string;
};

export type ActivityItem = {
  id: number;
  lesson: number;
  title: string;
  content: string;
  url: string | null;
  image: string | null;
  activity_type: ActivityType;
  created_at: string;
  user_submission: ActivitySubmission | null;
};

export type PendingSubmission = {
  id: number;
  user_email: string;
  user_name: string;
  activity_title: string;
  lesson_title: string;
  image_url: string | null;
  text_answer: string | null;
  submitted_at: string;
};

export type ActivityUpsertPayload = {
  lesson: number;
  title: string;
  content: string;
  url?: string;
  activity_type: ActivityType;
};

function baseApi() {
  const raw = (API_BASE_URL || "").trim();
  if (!raw) {
    throw new Error("Missing NEXT_PUBLIC_API_URL. Please set your backend API URL.");
  }
  return raw.endsWith("/") ? raw : `${raw}/`;
}

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function parseJsonResponse(res: Response, fallbackMessage: string) {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json().catch(() => ({}));
  }

  const text = await res.text().catch(() => "");
  if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
    throw new Error("Received HTML instead of JSON from API. Check NEXT_PUBLIC_API_URL and backend routes.");
  }
  if (!text) return {};
  throw new Error(fallbackMessage);
}

export async function fetchAllActivities(): Promise<ActivityItem[]> {
  const res = await fetch(`${baseApi()}activities/`, {
    headers: { ...authHeaders() },
  });
  const data = await parseJsonResponse(res, "Failed to load activities.");
  if (!res.ok) throw new Error((data as any)?.error || "Failed to load activities.");
  return Array.isArray(data) ? (data as ActivityItem[]) : [];
}

export async function fetchLessonActivities(lessonId: number): Promise<ActivityItem[]> {
  const res = await fetch(`${baseApi()}activities/lesson/${lessonId}/`, {
    headers: { ...authHeaders() },
  });
  const data = await parseJsonResponse(res, "Failed to load lesson activities.");
  if (!res.ok) throw new Error((data as any)?.error || "Failed to load lesson activities.");
  return Array.isArray(data) ? (data as ActivityItem[]) : [];
}

export async function submitActivity(
  activityId: number,
  payload: { textAnswer?: string; imageFile?: File | null }
): Promise<ActivitySubmission> {
  const fd = new FormData();
  if (payload.textAnswer) fd.append("text_answer", payload.textAnswer);
  if (payload.imageFile) fd.append("image_answer", payload.imageFile);

  const res = await fetch(`${baseApi()}activities/${activityId}/submit/`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: fd,
  });
  const data = await parseJsonResponse(res, "Failed to submit activity.");
  if (!res.ok) throw new Error(data?.error || data?.detail || "Failed to submit activity.");
  return data as ActivitySubmission;
}

export async function fetchPendingSubmissions(): Promise<PendingSubmission[]> {
  const res = await fetch(`${baseApi()}activities/admin/submissions/pending/`, {
    headers: { ...authHeaders() },
  });
  const data = await parseJsonResponse(res, "Failed to load pending submissions.");
  if (!res.ok) throw new Error((data as any)?.error || "Failed to load pending submissions.");
  return Array.isArray(data) ? (data as PendingSubmission[]) : [];
}

export async function gradeSubmission(submissionId: number, action: "APPROVE" | "REJECT") {
  const res = await fetch(`${baseApi()}activities/admin/submissions/${submissionId}/grade/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ action }),
  });
  const data = await parseJsonResponse(res, "Failed to grade submission.");
  if (!res.ok) throw new Error((data as any)?.error || "Failed to grade submission.");
  return data;
}

async function tryRequestJson(
  requests: Array<() => Promise<Response>>,
  fallbackMessage: string
) {
  let lastError: Error | null = null;
  for (const request of requests) {
    try {
      const res = await request();
      const data = await parseJsonResponse(res, fallbackMessage);
      if (res.ok) return data;
      lastError = new Error((data as any)?.error || (data as any)?.detail || fallbackMessage);
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(fallbackMessage);
    }
  }
  throw lastError || new Error(fallbackMessage);
}

export async function createActivity(payload: ActivityUpsertPayload): Promise<ActivityItem> {
  const headers = { "Content-Type": "application/json", ...authHeaders() };
  const body = JSON.stringify(payload);
  const data = await tryRequestJson(
    [
      () => fetch(`${baseApi()}activities/admin/`, { method: "POST", headers, body }),
      () => fetch(`${baseApi()}activities/`, { method: "POST", headers, body }),
    ],
    "Failed to create activity."
  );
  return data as ActivityItem;
}

export async function updateActivity(activityId: number, payload: ActivityUpsertPayload): Promise<ActivityItem> {
  const headers = { "Content-Type": "application/json", ...authHeaders() };
  const body = JSON.stringify(payload);
  const data = await tryRequestJson(
    [
      () => fetch(`${baseApi()}activities/admin/${activityId}/`, { method: "PATCH", headers, body }),
      () => fetch(`${baseApi()}activities/${activityId}/`, { method: "PATCH", headers, body }),
    ],
    "Failed to update activity."
  );
  return data as ActivityItem;
}

export async function deleteActivity(activityId: number): Promise<void> {
  const headers = { ...authHeaders() };
  await tryRequestJson(
    [
      () => fetch(`${baseApi()}activities/admin/${activityId}/`, { method: "DELETE", headers }),
      () => fetch(`${baseApi()}activities/${activityId}/`, { method: "DELETE", headers }),
    ],
    "Failed to delete activity."
  );
}
