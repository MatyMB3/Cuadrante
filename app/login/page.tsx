"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    const redirectTo =
      typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });
    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="scoreboard px-6 pt-10 pb-10 flex-1 flex flex-col justify-center">
      <p className="font-mono text-xs tracking-[0.25em] uppercase opacity-70">Cuadrante</p>
      <h1 className="font-display text-2xl font-semibold mt-2">Iniciar sesion</h1>
      <p className="text-sm opacity-70 mt-2">
        Solo para organizar eventos. Tus amigos no necesitan cuenta para confirmar.
      </p>

      {sent ? (
        <div className="bg-white/10 rounded-xl p-4 mt-6">
          <p className="text-sm">
            Te mandamos un link a <b>{email}</b>. Abrilo desde este mismo celular para entrar.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full rounded-xl p-4 text-ink"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-press w-full bg-white text-ink rounded-xl py-4 font-display font-semibold disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviarme el link magico"}
          </button>
          {errorMsg && <p className="text-sm text-red-300">{errorMsg}</p>}
        </form>
      )}

      <Link href="/" className="font-mono text-xs opacity-60 uppercase tracking-widest mt-8">
        {"\u2190"} Volver
      </Link>
    </div>
  );
}
