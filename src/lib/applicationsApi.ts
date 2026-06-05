import type {
  ApplicationStats,
  CreateApplicationRequest,
  JobApplication,
  UpdateApplicationRequest,
} from "./types";
import { ApiHttpError, apiFetch, apiUrl, readApiErrorBody, requireOk } from "./backendApi";
import { normalizeJobUrl } from "./jobSource";
import {
  mockCreateApplication,
  mockGetApplication,
  mockGetApplicationByUrl,
  mockListApplications,
  mockUpdateApplication,
} from "./mockApplications";

/** Surface backend `{ error }` JSON with HTTP status context for the UI. */
export function formatApplicationApiError(err: unknown): string {
  if (err instanceof ApiHttpError) {
    if (err.status === 401) return err.message || "Session expired. Please sign in again.";
    if (err.status === 403) return err.message || "Active subscription required to save jobs.";
    if (err.status === 503) return err.message || "Server is not ready. Try again shortly.";
    return err.message || `Request failed (${err.status})`;
  }
  return err instanceof Error ? err.message : "Could not save job.";
}

function normalizeCreateBody(body: CreateApplicationRequest): CreateApplicationRequest {
  return {
    ...body,
    jobUrl: normalizeJobUrl(body.jobUrl),
    company: body.company?.trim() || "Unknown company",
    title: body.title?.trim() || "Untitled role",
    location: body.location?.trim() ?? "",
    source: body.source?.trim() || "Web",
    jobDescription: body.jobDescription?.trim() ?? "",
  };
}

export async function apiListApplications(
  apiBaseUrl: string,
  token: string,
): Promise<{ applications: JobApplication[]; stats: ApplicationStats }> {
  const res = await apiFetch(apiUrl(apiBaseUrl, "/api/applications"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  await requireOk(res);
  return res.json() as Promise<{ applications: JobApplication[]; stats: ApplicationStats }>;
}

export async function apiGetApplicationByUrl(
  apiBaseUrl: string,
  token: string,
  jobUrl: string,
): Promise<JobApplication | null> {
  const q = encodeURIComponent(normalizeJobUrl(jobUrl));
  const res = await apiFetch(apiUrl(apiBaseUrl, `/api/applications/by-url?url=${q}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  await requireOk(res);
  const data = (await res.json()) as { application: JobApplication | null };
  return data.application;
}

export async function apiGetApplication(
  apiBaseUrl: string,
  token: string,
  id: string,
): Promise<JobApplication> {
  const res = await apiFetch(apiUrl(apiBaseUrl, `/api/applications/${id}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  await requireOk(res);
  const data = (await res.json()) as { application: JobApplication };
  return data.application;
}

export async function apiCreateApplication(
  apiBaseUrl: string,
  token: string,
  body: CreateApplicationRequest,
): Promise<{ application: JobApplication; alreadySaved: boolean; message?: string }> {
  const payload = normalizeCreateBody(body);
  const res = await apiFetch(apiUrl(apiBaseUrl, "/api/applications"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new ApiHttpError(res.status, await readApiErrorBody(res));
  }
  const data = (await res.json()) as {
    application: JobApplication;
    alreadySaved?: boolean;
    message?: string;
  };
  return {
    application: data.application,
    alreadySaved: Boolean(data.alreadySaved),
    message: data.message,
  };
}

export async function apiUpdateApplication(
  apiBaseUrl: string,
  token: string,
  id: string,
  body: UpdateApplicationRequest,
): Promise<JobApplication> {
  const res = await apiFetch(apiUrl(apiBaseUrl, `/api/applications/${id}`), {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await requireOk(res);
  const data = (await res.json()) as { application: JobApplication };
  return data.application;
}

export async function listApplications(
  apiBaseUrl: string,
  token: string | undefined,
  useMock: boolean,
): Promise<{ applications: JobApplication[]; stats: ApplicationStats }> {
  if (useMock || !token?.trim() || !apiBaseUrl.trim()) return mockListApplications();
  return apiListApplications(apiBaseUrl, token);
}

export async function getApplicationByUrl(
  apiBaseUrl: string,
  token: string | undefined,
  useMock: boolean,
  jobUrl: string,
): Promise<JobApplication | null> {
  if (useMock || !token?.trim() || !apiBaseUrl.trim()) return mockGetApplicationByUrl(jobUrl);
  return apiGetApplicationByUrl(apiBaseUrl, token, jobUrl);
}

export async function getApplication(
  apiBaseUrl: string,
  token: string | undefined,
  useMock: boolean,
  id: string,
): Promise<JobApplication | null> {
  if (useMock || !token?.trim() || !apiBaseUrl.trim()) return mockGetApplication(id);
  try {
    return await apiGetApplication(apiBaseUrl, token, id);
  } catch {
    return null;
  }
}

export async function createApplication(
  apiBaseUrl: string,
  token: string | undefined,
  useMock: boolean,
  body: CreateApplicationRequest,
): Promise<{ application: JobApplication; alreadySaved: boolean; message?: string }> {
  const payload = normalizeCreateBody(body);
  if (useMock || !token?.trim() || !apiBaseUrl.trim()) {
    const application = await mockCreateApplication(payload);
    return { application, alreadySaved: false };
  }
  return apiCreateApplication(apiBaseUrl, token, payload);
}

export async function updateApplication(
  apiBaseUrl: string,
  token: string | undefined,
  useMock: boolean,
  id: string,
  body: UpdateApplicationRequest,
): Promise<JobApplication> {
  if (useMock || !token?.trim() || !apiBaseUrl.trim()) {
    const updated = await mockUpdateApplication(id, body);
    if (!updated) throw new Error("Application not found.");
    return updated;
  }
  return apiUpdateApplication(apiBaseUrl, token, id, body);
}

export async function pollApplicationUntilReady(
  apiBaseUrl: string,
  token: string | undefined,
  useMock: boolean,
  id: string,
  onUpdate: (app: JobApplication) => void,
  signal?: AbortSignal,
): Promise<JobApplication> {
  const poll = async (): Promise<JobApplication> => {
    const app = await getApplication(apiBaseUrl, token, useMock, id);
    if (!app) throw new Error("Application not found.");
    onUpdate(app);
    if (app.status === "READY_TO_APPLY" || app.status === "SAVED" || app.preparationError) return app;
    await new Promise((r) => setTimeout(r, 2000));
    if (signal?.aborted) throw new Error("Polling cancelled.");
    return poll();
  };
  return poll();
}
