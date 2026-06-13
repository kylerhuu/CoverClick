import { ApiHttpError, apiFetch, apiUrl, requireOk } from "./backendApi";
import type { JobContext, UserProfile } from "./types";

export type JobFitScoreResult = {
  jobFitScore: number;
  atsScore: number;
  summary: string;
};

export async function requestJobFitScore(
  apiBaseUrl: string,
  token: string,
  profile: UserProfile,
  job: JobContext,
): Promise<JobFitScoreResult> {
  const res = await apiFetch(apiUrl(apiBaseUrl, "/api/job-fit-score"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ profile, job }),
  });
  await requireOk(res);
  const data = (await res.json()) as JobFitScoreResult;
  return data;
}

export function formatJobFitApiError(err: unknown): string | null {
  if (err instanceof ApiHttpError) {
    if (err.status === 401) return null;
    return err.message;
  }
  return err instanceof Error ? err.message : null;
}
