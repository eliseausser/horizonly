"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const router = useRouter();

  // loading = évite afficher la page avant chargement
  const [loading, setLoading] = useState(true);

  // liste des events venant de Supabase
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      // récupérer session utilisateur
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // si pas connecté → login
      if (!session) {
        router.push("/login");
        return;
      }

      // utilisateur connecté
      const currentUser = session.user;

      // récupérer les events du user connecté
      const { data: eventsData, error } = await supabase
        .from("events")
        .select("*")
        .eq("owner_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur events :", error.message);
      } else {
        setEvents(eventsData);
      }

      // chargement terminé
      setLoading(false);
    }

    load();
  }, [router]);

  // logout
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  // écran chargement
  if (loading) return <p>Chargement...</p>;

  return (
    <div style={{ padding: 40 }}>
      <h1>Dashboard OK ✈️</h1>

      {/* SECTION EVENTS */}
      <h2 style={{ marginTop: 30 }}>Mes événements</h2>

      {/* si aucun event */}
      {events.length === 0 ? (
        <p>Aucun événement pour le moment</p>
      ) : (
        events.map((event) => (
          <div
            key={event.id}
            style={{
              border: "1px solid #ccc",
              padding: 12,
              marginTop: 10,
              borderRadius: 8,
            }}
          >
            <h3>{event.title}</h3>
            <p>Type : {event.type}</p>
          </div>
        ))
      )}

      {/* bouton logout */}
      <button
        onClick={handleLogout}
        style={{
          marginTop: 30,
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