"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function load() {
      // 1. vérifier session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const currentUser = session.user;
      setUser(currentUser);

      // 2. récupérer profil
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      setProfile(profileData);

      setLoading(false);
    }

    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return <p>Chargement...</p>;

  return (
    <div style={{ padding: 40 }}>
      <h1>Dashboard OK ✈️</h1>

      {profile && (
        <div style={{ marginTop: 20 }}>
          <img
            src={profile.avatar_url}
            width={50}
            style={{ borderRadius: "50%" }}
          />
          <p>Bienvenue {profile.full_name}</p>
        </div>
      )}

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