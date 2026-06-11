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

  if (loading) return <p>Chargement...</p>;

  return (
    <div style={{ padding: 40 }}>
      <button onClick={() => setShowForm(!showForm)} style={btn}>
        Commencer un projet
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

      <h2 style={{ marginTop: 30 }}>Mes projets</h2>

      {events.length === 0 ? (
        <p>Aucun projet pour le moment</p>
      ) : (
        events.map((event) => (
          <div
            key={event.id}
            style={{
              border: "1px solid #ddd",
              borderLeft: `6px solid ${getTypeColor(event.type)}`,
              padding: 16,
              marginTop: 12,
              borderRadius: 12,
              background: "white",
              display: "flex",
              justifyContent: "space-between",
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
              <h3
  style={{
    fontWeight: 700,
    fontSize: 22,
    margin: "0 0 10px 0",
  }}
>
  {event.title}
</h3>

              <div
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
              </div>

              <p>
                Dates : {event.start_date} → {event.end_date}
              </p>

              <p>Budget : {event.budget_total} €</p>
            </Link>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => startEditEvent(event)} style={smallBtn}>
                Modifier
              </button>

              <button
                onClick={() => deleteEvent(event.id)}
                style={{ ...smallBtn, background: "red", color: "white" }}
              >
                Supprimer
              </button>
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
        ))
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