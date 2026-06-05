import { Prisma } from "@prisma/client";

const IS_PRODUCTION =
  process.env.NODE_ENV === "production" || Boolean(process.env.RAILWAY_ENVIRONMENT?.trim());

/** Map Prisma / validation failures to HTTP status + client-safe message. */
export function applicationRouteError(err: unknown): { status: number; error: string } {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2021":
        return {
          status: 503,
          error:
            "Job applications storage is not ready. The server needs a database migration (prisma migrate deploy).",
        };
      case "P2002":
        return { status: 200, error: "" }; // handled as already-saved success upstream
      case "P2003":
        return { status: 401, error: "Account not found. Please sign out and sign in again." };
      case "P2025":
        return { status: 404, error: "Application not found." };
      default:
        break;
    }
  }

  if (err instanceof TypeError && /trim is not a function/i.test(String(err.message))) {
    return { status: 400, error: "Invalid request body: expected string fields for jobUrl, company, and title." };
  }

  const message = err instanceof Error ? err.message : "Something went wrong.";
  return {
    status: 500,
    error: IS_PRODUCTION ? "Something went wrong. Please try again." : message,
  };
}

export function logApplicationRouteError(route: string, err: unknown, context?: Record<string, unknown>): void {
  console.error(`[${route}]`, {
    ...context,
    err: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
    prismaCode: err instanceof Prisma.PrismaClientKnownRequestError ? err.code : undefined,
  });
}
