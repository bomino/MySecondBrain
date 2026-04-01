import { NextResponse } from "next/server";

export function success<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, code: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, code, details }, { status });
}

export function unauthorized() {
  return error("Unauthorized", "UNAUTHORIZED", 401);
}

export function notFound(resource: string) {
  return error(`${resource} not found`, "NOT_FOUND", 404);
}

export function badRequest(message: string, details?: unknown) {
  return error(message, "BAD_REQUEST", 400, details);
}
