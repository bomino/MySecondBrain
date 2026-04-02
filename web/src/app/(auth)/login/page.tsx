"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setErrorMsg("Invalid email or password");
    } else {
      router.push("/notes");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--background)" }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-[10px] p-8 fade-in"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-center gap-2 pb-2">
          <img src="/logo.png" alt="Second Brain" className="h-16 w-16 rounded-lg object-contain" />
          <span className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Second Brain</span>
        </div>

        <h1 className="text-center text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Sign In</h1>

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
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 text-sm input-base"
          required
        />
        <button type="submit" className="w-full rounded-lg px-3 py-2.5 text-sm btn-accent">
          Sign In
        </button>
        <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
          No account?{" "}
          <a href="/register" style={{ color: "var(--accent-light)" }} className="hover:underline">
            Register
          </a>
        </p>
      </form>
    </div>
  );
}
