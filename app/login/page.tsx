"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error, data } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError(error.message);
          return;
        }
        if (!data.session) {
          setInfo("Konto utworzone! Sprawdź skrzynkę e-mail, aby potwierdzić rejestrację.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(error.message);
          return;
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-6">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-[var(--foreground)]">
          {mode === "signin" ? "Zaloguj się" : "Zarejestruj się"}
        </h1>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          Marta AI — Twoje rozmowy, tylko Twoje.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="rounded-md border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-2.5 text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Hasło (min. 6 znaków)"
            className="rounded-md border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-2.5 text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-[var(--success)]">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-[var(--accent)] px-5 py-3 font-medium text-white transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-40"
          >
            {loading ? "Chwileczkę..." : mode === "signin" ? "Zaloguj się" : "Zarejestruj się"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "signin" ? "signup" : "signin"));
            setError("");
            setInfo("");
          }}
          className="mt-4 w-full text-center text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--foreground)]"
        >
          {mode === "signin" ? "Nie masz konta? Zarejestruj się" : "Masz już konto? Zaloguj się"}
        </button>
      </div>
    </div>
  );
}
