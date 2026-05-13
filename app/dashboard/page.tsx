"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/login");
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

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