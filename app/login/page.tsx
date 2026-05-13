"use client";

import { supabase } from "@/lib/supabase";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔵 GOOGLE LOGIN
  async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) console.error(error.message);
}

  // ✉️ EMAIL LOGIN
  async function loginWithEmail() {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      console.error("Login error:", error.message);
      return;
    }

    window.location.href = "/dashboard";
  }

  // 🆕 SIGN UP (créer compte)
  async function signUp() {
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      console.error("Signup error:", error.message);
      return;
    }

    alert("Compte créé ! Vérifie ton email.");
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Connexion</h1>

      {/* EMAIL / PASSWORD */}
      <input
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", marginBottom: 10 }}
      />

      <input
        placeholder="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: "block", marginBottom: 10 }}
      />

      <button onClick={loginWithEmail} disabled={loading}>
        Se connecter
      </button>

      <button onClick={signUp} disabled={loading}>
        Créer un compte
      </button>

      <hr style={{ margin: "20px 0" }} />

      {/* GOOGLE LOGIN */}
      <button onClick={loginWithGoogle}>
        Continuer avec Google
      </button>
    </div>
  );
}