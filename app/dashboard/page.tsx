"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export default function Dashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function load() {
      // 1. récupérer session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const currentUser = session.user;
      setUser(currentUser);

      // 2. récupérer profil
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (error) {
        console.error("Erreur profil:", error.message);
      }

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
      <h1>Dashboard ✈️</h1>

      {/* USER INFO */}
      {profile && (
        <div style={{ marginTop: 20 }}>
          {profile.avatar_url && (
            <img
              src={profile.avatar_url}
              width={60}
              style={{ borderRadius: "50%" }}
              alt="avatar"
            />
          )}

          <p style={{ fontSize: 18 }}>
            Bienvenue {profile.full_name ?? "Utilisateur"}
          </p>
        </div>
      )}

      {/* DEBUG OPTION (utile) */}
      {user && (
        <p style={{ fontSize: 12, opacity: 0.6 }}>
          user id: {user.id}
        </p>
      )}

      {/* LOGOUT */}
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
