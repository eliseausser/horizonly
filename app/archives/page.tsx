"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { X } from "lucide-react";
import TopBar from "../components/TopBar";

export default function ArchivesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) console.error(error.message);
      else setEvents(data || []);

      setLoading(false);
    }

    load();
  }, [router]);

  async function deleteEvent(eventId: string) {
    const { error } = await supabase.from("events").delete().eq("id", eventId);

    if (error) {
      console.error(error.message);
      return;
    }

    setEvents((prev) => prev.filter((event) => event.id !== eventId));
  }

  function getTypeColor(type: string) {
    switch (type?.toLowerCase()) {
      case "voyage":
        return "#6E8570";
      case "evenement":
        return "#A8BFA5";
      default:
        return "#8A8A7A";
    }
  }

  function renderEventCard(event: any) {
    return (
      <div key={event.id}>
        {confirmDeleteId === event.id && (
          <div style={modalOverlay}>
            <div style={modal}>

<p>Voulez-vous supprimer définitivement ce projet ?</p>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setConfirmDeleteId(null)} style={smallBtn}>
                  Non
                </button>

                <button
                  onClick={() => {
                    deleteEvent(event.id);
                    setConfirmDeleteId(null);
                  }}
                  style={{ ...smallBtn, background: "#dc2626", color: "white" }}
                >
                  Oui
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={projectCard}>
          <Link href={`/event/${event.id}`} style={projectLink}>
            <div style={projectHeader}>
              <div style={projectLeft}>
                <span style={{ ...typeBadge, background: getTypeColor(event.type) }}>
                  {event.type || "Projet"}
                </span>

                <h3 style={projectTitle}>{event.title}</h3>
              </div>

              <span style={statusBadge}>Archivé</span>
            </div>
          </Link>

          <div style={{ position: "relative" }}>
<button
  onClick={(e) => {
    e.preventDefault();
    setConfirmDeleteId(event.id);
  }}
  style={iconBtn}
>
  <X size={18} />
</button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <p style={page}>Chargement...</p>;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const archivedEvents = events.filter((event) => {
    if (!event.end_date) return false;

    const end = new Date(event.end_date);
    end.setHours(0, 0, 0, 0);

    return end < today;
  });

  return (
    <>
      <TopBar />

      <div style={page}>
        <button onClick={() => router.push("/dashboard")} style={backBtn}>
          ← Retour aux projets
        </button>

        <h2 style={sectionTitle}>Archives</h2>

        {archivedEvents.length === 0 ? (
          <p style={emptyText}>Aucun projet archivé.</p>
        ) : (
          archivedEvents.map((event) => renderEventCard(event))
        )}
      </div>
    </>
  );
}

const page = {
  minHeight: "100vh",
  padding: 40,
  background: "#F4F1EC",
  color: "#222222",
};

const backBtn = {
  padding: "9px 14px",
  border: "1px solid #D8D2C8",
  borderRadius: 999,
  background: "#FAFAF8",
  color: "#222222",
  cursor: "pointer",
  fontWeight: 600,
  marginBottom: 20,
};

const sectionTitle = {
  marginTop: 36,
  marginBottom: 14,
  fontSize: 26,
  fontWeight: 700,
  color: "#6E8570",
};

const emptyText = {
  color: "#8A8A7A",
  fontSize: 15,
  fontWeight: 400,
};

const smallBtn = {
  padding: "8px 13px",
  border: "1px solid #D8D2C8",
  borderRadius: 10,
  background: "#FAFAF8",
  color: "#222222",
  cursor: "pointer",
  fontWeight: 600,
};

const iconBtn = {
  width: 36,
  height: 36,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  border: "1px solid #D8D2C8",
  borderRadius: 10,
  background: "#FAFAF8",
  color: "#222222",
  cursor: "pointer",
  padding: 0,
};

const modalOverlay = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const modal = {
  width: 360,
  padding: 20,
  borderRadius: 14,
  background: "#FAFAF8",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};

const projectCard = {
  border: "1px solid #DED8CE",
  padding: 18,
  marginTop: 12,
  borderRadius: 18,
  background: "#FAFAF8",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  boxShadow: "0 12px 30px rgba(34,34,34,0.05)",
};

const projectLink = {
  textDecoration: "none",
  color: "inherit",
  flex: 1,
};

const projectHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
};

const projectLeft = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const typeBadge = {
  width: 100,
  flexShrink: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "6px 11px",
  borderRadius: 999,
  color: "#FAFAF8",
  fontSize: 12,
  fontWeight: 600,
  textTransform: "capitalize" as const,
};

const projectTitle = {
  flex: 1,
  margin: 0,
  fontSize: 21,
  fontWeight: 700,
  color: "#222222",
};

const statusBadge = {
  width: 90,
  flexShrink: 0,
  textAlign: "center" as const,
  fontSize: 16,
  fontWeight: 700,
  color: "#6E8570",
};