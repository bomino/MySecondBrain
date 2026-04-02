"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setErrorMsg(data.error || "Registration failed");
      return;
    }

    router.push("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--background)" }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-[10px] p-8 fade-in"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-center gap-2 pb-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: "var(--gradient-logo)" }}
          >
            S
          </div>
          <span className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Second Brain</span>
        </div>

        <h1 className="text-center text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Create Account</h1>

        {errorMsg && (
          <p className="text-center text-sm" style={{ color: "var(--destructive)" }}>{errorMsg}</p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 text-sm input-base"
          required
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 text-sm input-base"
          minLength={8}
          required
        />
        <button type="submit" className="w-full rounded-lg px-3 py-2.5 text-sm btn-accent">
          Register
        </button>
        <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <a href="/login" style={{ color: "var(--accent-light)" }} className="hover:underline">
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
}
