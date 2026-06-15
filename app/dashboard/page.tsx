"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);

  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editBudget, setEditBudget] = useState("");

  const [openEventMenuId, setOpenEventMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const currentUser = session.user;

      const { data: eventsData, error } = await supabase
        .from("events")
        .select("*")
        .eq("owner_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur events :", error.message);
      } else {
        setEvents(eventsData || []);
      }

      setLoading(false);
    }

    load();
  }, [router]);

  async function handleCreateEvent() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    const currentUser = session.user;

    const { data, error } = await supabase
      .from("events")
      .insert([
        {
          owner_id: currentUser.id,
          title,
          type,
          start_date: startDate || null,
          end_date: endDate || null,
          budget_total: budget ? Number(budget) : 0,
        },
      ])
      .select();

    if (error) {
      console.error("Insert error:", error.message);
      return;
    }

    setEvents([data[0], ...events]);

    setTitle("");
    setType("");
    setStartDate("");
    setEndDate("");
    setBudget("");
    setShowForm(false);
  }

  async function deleteEvent(eventId: string) {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId);

    if (error) {
      console.error("Delete event error:", error.message);
      return;
    }

    setEvents((prev) => prev.filter((event) => event.id !== eventId));
  }

  function startEditEvent(event: any) {
    setEditingEventId(event.id);
    setEditTitle(event.title || "");
    setEditType(event.type || "");
    setEditStartDate(event.start_date || "");
    setEditEndDate(event.end_date || "");
    setEditBudget(event.budget_total?.toString() || "");
  }

  async function updateEvent(eventId: string) {
    const { data, error } = await supabase
      .from("events")
      .update({
        title: editTitle,
        type: editType,
        start_date: editStartDate || null,
        end_date: editEndDate || null,
        budget_total: editBudget ? Number(editBudget) : 0,
      })
      .eq("id", eventId)
      .select()
      .single();

    if (error) {
      console.error("Update event error:", error.message);
      return;
    }

    setEvents((prev) =>
      prev.map((event) => (event.id === eventId ? data : event))
    );

    setEditingEventId(null);
  }

  function getTypeColor(type: string) {
    switch (type?.toLowerCase()) {
      case "voyage":
        return "#22c55e";
      case "evenement":
        return "#3b82f6";
      default:
        return "#888";
    }
  }

  function getDaysUntilEvent(startDate: string) {
    if (!startDate) return "-";

    const today = new Date();
    const eventDate = new Date(startDate);

    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);

    const diff = eventDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function renderEventCard(event: any, showCountdown = true) {
    return (
      <div key={event.id}>
        {confirmDeleteId === event.id && (
          <div style={modalOverlay}>
            <div style={modal}>
              <h3>Supprimer ce projet ?</h3>
              <p>Voulez-vous vraiment supprimer ce projet ?</p>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  style={smallBtn}
                >
                  Non
                </button>

                <button
                  onClick={() => {
                    deleteEvent(event.id);
                    setConfirmDeleteId(null);
                  }}
                  style={{ ...smallBtn, background: "red", color: "white" }}
                >
                  Oui, supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            border: "1px solid #ddd",
            borderLeft: `6px solid ${getTypeColor(event.type)}`,
            padding: 16,
            marginTop: 12,
            borderRadius: 12,
            background: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 20,
          }}
        >
          <Link
            href={`/event/${event.id}`}
            style={{
              textDecoration: "none",
              color: "inherit",
              flex: 1,
            }}
          >
            <div style={projectMainRow}>
              <div>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: getTypeColor(event.type),
                    color: "white",
                    fontSize: 12,
                    fontWeight: "bold",
                    marginBottom: 10,
                  }}
                >
                  {event.type}
                </span>

                <h3 style={projectTitle}>{event.title}</h3>
              </div>

              {showCountdown && (
  <span style={countdownBadge}>
    J-{getDaysUntilEvent(event.start_date)}
  </span>
)}
            </div>
          </Link>

          <div style={{ position: "relative" }}>
            <button
              onClick={(e) => {
                e.preventDefault();
                setOpenEventMenuId(
                  openEventMenuId === event.id ? null : event.id
                );
              }}
              style={iconBtn}
            >
              ✏️
            </button>

            {openEventMenuId === event.id && (
              <div style={miniMenu}>
                <button
                  style={menuItem}
                  onClick={(e) => {
                    e.preventDefault();
                    startEditEvent(event);
                    setOpenEventMenuId(null);
                  }}
                >
                  Modifier
                </button>

                <button
                  style={{ ...menuItem, color: "red" }}
                  onClick={(e) => {
                    e.preventDefault();
                    setConfirmDeleteId(event.id);
                    setOpenEventMenuId(null);
                  }}
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>

        {editingEventId === event.id && (
          <div style={formCard}>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={input}
            />

            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
              style={input}
            >
              <option value="voyage">Voyage</option>
              <option value="evenement">Événement</option>
            </select>

            <input
              type="date"
              value={editStartDate}
              onChange={(e) => setEditStartDate(e.target.value)}
              style={input}
            />

            <input
              type="date"
              value={editEndDate}
              onChange={(e) => setEditEndDate(e.target.value)}
              style={input}
            />

            <input
              type="number"
              value={editBudget}
              onChange={(e) => setEditBudget(e.target.value)}
              style={input}
            />

            <button onClick={() => updateEvent(event.id)} style={btn}>
              Enregistrer
            </button>

            <button onClick={() => setEditingEventId(null)} style={smallBtn}>
              Annuler
            </button>
          </div>
        )}
      </div>
    );
  }

  if (loading) return <p>Chargement...</p>;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ongoingEvents = events.filter((event) => {
    if (!event.start_date || !event.end_date) return true;

    const start = new Date(event.start_date);
    const end = new Date(event.end_date);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return start <= today && end >= today;
  });

  const upcomingEvents = events.filter((event) => {
    if (!event.start_date) return false;

    const start = new Date(event.start_date);
    start.setHours(0, 0, 0, 0);

    return start > today;
  });

  const pastEvents = events.filter((event) => {
    if (!event.end_date) return false;

    const end = new Date(event.end_date);
    end.setHours(0, 0, 0, 0);

    return end < today;
  });

  return (
    <div style={{ padding: 40 }}>
      <button onClick={() => setShowForm(!showForm)} style={btn}>
        Nouveau projet
      </button>

      {showForm && (
        <div style={formCard}>
          <h2>Créer un projet</h2>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre"
            style={input}
          />

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={input}
          >
            <option value="">Choisir un type</option>
            <option value="voyage">Voyage</option>
            <option value="evenement">Événement</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={input}
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={input}
          />

          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Budget"
            style={input}
          />

          <button onClick={handleCreateEvent} style={btn}>
            Créer le projet
          </button>
        </div>
      )}

      <h2 style={{ marginTop: 30 }}>Projets en cours</h2>
      {ongoingEvents.length === 0 ? (
        <p>Aucun projet en cours.</p>
      ) : (
        ongoingEvents.map((event) => renderEventCard(event, false))
      )}

      <h2 style={{ marginTop: 45 }}>Projets à venir</h2>
      {upcomingEvents.length === 0 ? (
        <p>Aucun projet à venir.</p>
      ) : (
        upcomingEvents.map((event) => renderEventCard(event))
      )}

      <h2 style={{ marginTop: 45 }}>Historique de mes projets</h2>
      {pastEvents.length === 0 ? (
        <p>Aucun projet terminé.</p>
      ) : (
        pastEvents.map((event) => renderEventCard(event, false))
      )}
    </div>
  );
}

const btn = {
  padding: "10px 16px",
  background: "black",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

const input = {
  width: "100%",
  padding: 10,
  marginTop: 10,
  border: "1px solid #ddd",
  borderRadius: 8,
};

const formCard = {
  marginTop: 20,
  padding: 20,
  border: "1px solid #ddd",
  borderRadius: 12,
  background: "white",
  maxWidth: 400,
};

const smallBtn = {
  padding: "7px 12px",
  border: "1px solid #ddd",
  borderRadius: 8,
  background: "white",
  cursor: "pointer",
};

const iconBtn = {
  width: 34,
  height: 34,
  border: "1px solid #ddd",
  borderRadius: 8,
  background: "white",
  cursor: "pointer",
};

const miniMenu = {
  position: "absolute" as const,
  right: 0,
  top: 38,
  width: 140,
  background: "white",
  border: "1px solid #ddd",
  borderRadius: 10,
  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
  overflow: "hidden",
  zIndex: 20,
};

const menuItem = {
  display: "block",
  width: "100%",
  padding: "9px 12px",
  border: "none",
  background: "white",
  textAlign: "left" as const,
  cursor: "pointer",
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
  background: "white",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};

const projectMainRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 20,
};

const projectTitle = {
  fontWeight: 700,
  fontSize: 22,
  margin: 0,
};

const countdownBadge = {
  fontSize: 40,
  fontWeight: 800,
  color: "#111",
  minWidth: 110,
  textAlign: "right" as const,
};