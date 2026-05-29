"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  // 🔴 IMPORTANT : on ne peut PAS faire "await" ici
  // const { data: user } = await supabase.auth.getUser() ❌ supprimé

  useEffect(() => {
    async function load() {
      // récupérer session utilisateur
      const { data: { session } } = await supabase.auth.getSession();

      // si pas connecté → redirection login
      if (!session) {
        router.push("/login");
        return;
      }

      setLoading(false);
    }

    load();
  }, [router]);

  // fonction logout
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // loading screen
  if (loading) return <p>Chargement...</p>;

  return (
    <div style={{ padding: 40 }}>
      <h1>Dashboard OK ✈️</h1>

      <button
        onClick={handleLogout}
        style={{
          marginTop: 20,
          padding: "10px 16px",
          borderRadius: "10px",
          border: "none",
          background: "red",
          color: "white",
          cursor: "pointer",
        }}
      >
        Déconnexion
      </button>
    </div>
  );
}