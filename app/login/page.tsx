"use client";

import { supabase } from "@/lib/supabase";
import { useState } from "react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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

    if (error) setMessage(error.message);
  }

  async function loginWithEmail() {
    setMessage("");

    if (!email.trim() || !password.trim()) {
      setMessage("Merci de remplir tous les champs.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage("Email ou mot de passe incorrect.");
      return;
    }

    window.location.href = "/dashboard";
  }

  async function signUp() {
    setMessage("");

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setMessage("Merci de remplir tous les champs.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    if (password.length < 6) {
      setMessage("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Compte créé ! Vérifie ton email pour confirmer ton compte.");
  }

  async function resetPassword() {
    setMessage("");

    if (!email.trim()) {
      setMessage("Entre ton email pour réinitialiser ton mot de passe.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Email de réinitialisation envoyé.");
  }

  return (
    <div style={page}>
      <div style={card}>
        <div style={brand}>
<img
  src="/logo.svg"
  alt="MERGE"
  style={{
    width: 52,
    height: 52,
    objectFit: "contain",
    display: "block",
  }}
/>

          <div>
            <h1 style={title}>MERGE</h1>
            <p style={subtitle}>
              Organisez tous vos projets.
            </p>
          </div>
        </div>

        <div style={tabs}>
          <button
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
            style={mode === "login" ? activeTab : tab}
          >
            Connexion
          </button>

          <button
            onClick={() => {
              setMode("signup");
              setMessage("");
            }}
            style={mode === "signup" ? activeTab : tab}
          >
            Créer un compte
          </button>
        </div>

        <div style={form}>
          {mode === "signup" && (
            <input
              placeholder="Nom complet"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={input}
            />
          )}

          <input
            placeholder="Adresse email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={input}
          />

          <div style={passwordWrapper}>
            <input
              placeholder="Mot de passe"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={passwordInput}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={eyeBtn}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

<label
  style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "#555",
    cursor: "pointer",
  }}
>
  <input
    type="checkbox"
    checked={staySignedIn}
    onChange={(e) => setStaySignedIn(e.target.checked)}
  />
  Rester connecté
</label>

          {mode === "signup" && (
            <input
              placeholder="Confirmer le mot de passe"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={input}
            />
          )}

          {message && <p style={messageStyle}>{message}</p>}

          {mode === "login" ? (
            <>
              <button
                onClick={loginWithEmail}
                disabled={loading}
                style={primaryBtn}
              >
                {loading ? "Connexion..." : "Se connecter"}
              </button>

              <button onClick={resetPassword} style={linkBtn}>
                Mot de passe oublié ?
              </button>
            </>
          ) : (
            <button onClick={signUp} disabled={loading} style={primaryBtn}>
              {loading ? "Création..." : "Créer mon compte"}
            </button>
          )}

          <div style={separator}>
            <span style={line} />
            <span style={separatorText}>ou</span>
            <span style={line} />
          </div>

          <button onClick={loginWithGoogle} style={googleBtn}>
            Continuer avec Google
          </button>
        </div>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: "#F4F1EC",
};

const card = {
  width: "100%",
  maxWidth: 460,
  padding: 32,
  borderRadius: 24,
  background: "#FAFAF8",
  boxShadow: "0 25px 80px rgba(34,34,34,0.10)",
  border: "1px solid rgba(110,133,112,0.18)",
};

const brand = {
  display: "flex",
  gap: 16,
  alignItems: "center",
  marginBottom: 28,
};

const logo = {
  width: 52,
  height: 52,
  borderRadius: 16,
  background: "black",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  fontSize: 24,
};

const title = {
  margin: 0,
  fontSize: 28,
  letterSpacing: "-1px",
  color: "#222222",
  fontWeight: 700,
};

const subtitle = {
  margin: "6px 0 0 0",
  color: "#6E8570",
  lineHeight: 1.4,
};

const tabs = {
  display: "flex",
  padding: 4,
  borderRadius: 999,
  background: "#F4F1EC",
  marginBottom: 22,
};

const tab = {
  flex: 1,
  padding: "10px 12px",
  border: "none",
  borderRadius: 999,
  background: "transparent",
  cursor: "pointer",
  fontWeight: 600,
  color: "#6E8570",
};

const activeTab = {
  ...tab,
  background: "#FAFAF8",
  color: "#222222",
  boxShadow: "0 3px 12px rgba(34,34,34,0.08)",
};

const form = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 12,
};

const input = {
  width: "100%",
  padding: "13px 14px",
  border: "1px solid #ddd",
  borderRadius: 12,
  fontSize: 15,
  boxSizing: "border-box" as const,
};

const passwordWrapper = {
  display: "flex",
  alignItems: "center",
  border: "1px solid #ddd",
  borderRadius: 12,
  overflow: "hidden",
};

const passwordInput = {
  flex: 1,
  padding: "13px 14px",
  border: "none",
  outline: "none",
  fontSize: 15,
};

const eyeBtn = {
  border: "none",
  background: "white",
  padding: "0 12px",
  cursor: "pointer",
  fontSize: 18,
};

const primaryBtn = {
  padding: "13px 14px",
  borderRadius: 12,
  border: "none",
  background: "#6E8570",
  color: "#FAFAF8",
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 4,
};

const googleBtn = {
  padding: "13px 14px",
  borderRadius: 12,
  border: "1px solid rgba(110,133,112,0.28)",
  background: "#FAFAF8",
  color: "#222222",
  fontWeight: 700,
  cursor: "pointer",
};

const linkBtn = {
  border: "none",
  background: "transparent",
  color: "#6E8570",
  cursor: "pointer",
  textDecoration: "underline",
};

const separator = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  margin: "8px 0",
};

const line = {
  height: 1,
  flex: 1,
  background: "#eee",
};

const separatorText = {
  color: "#777",
  fontSize: 14,
};

const messageStyle = {
  margin: 0,
  color: "#b91c1c",
  fontSize: 14,
};