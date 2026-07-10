"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Pencil } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fr } from "date-fns/locale";

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
      return "#6E8570";
    case "evenement":
      return "#A8BFA5";
    default:
      return "#8A8A7A";
  }
}

function getProjectStatus(event: any) {
  if (!event.start_date) return "-";

  const today = new Date();
  const start = new Date(event.start_date);
  const end = event.end_date ? new Date(event.end_date) : start;

  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (today < start) {
    const days = Math.ceil(
      (start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return `J-${days}`;
  }

  if (today > end) {
    const days = Math.ceil(
      (today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24)
    );
    return `J+${days}`;
  }

  return "En cours";
}

function stringToDate(value: string | null) {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateToString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function renderEventCard(event: any) {
  return (
    <div key={event.id}>
      {confirmDeleteId === event.id && (
        <div style={modalOverlay}>
          <div style={modal}>
            <h3>Supprimer ce projet ?</h3>
            <p>Voulez-vous vraiment supprimer ce projet ?</p>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDeleteId(null)} style={smallBtn}>
                Non
              </button>

              <button
                onClick={() => {
                  deleteEvent(event.id);
                  setConfirmDeleteId(null);
                }}
                style={{ ...smallBtn, background: "red", color: "white" }}
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
              <span
                style={{
                  ...typeBadge,
                  background: getTypeColor(event.type),
                }}
              >
                {event.type || "Projet"}
              </span>

              <h3 style={projectTitle}>{event.title}</h3>
            </div>

            <span style={statusBadge}>{getProjectStatus(event)}</span>
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
            <Pencil size={16} />
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

<DatePicker
  selected={stringToDate(editStartDate)}
  onChange={(date: Date | null) => {
    if (!date) return;

    const value = dateToString(date);
    setEditStartDate(value);

    if (editEndDate && value > editEndDate) {
      setEditEndDate("");
    }
  }}
  dateFormat="dd/MM/yyyy"
  locale={fr}
  placeholderText="Date de début"
/>

<DatePicker
  selected={stringToDate(editEndDate)}
  onChange={(date: Date | null) => {
    if (!date) return;
    setEditEndDate(dateToString(date));
  }}
  minDate={stringToDate(editStartDate) || undefined}
  dateFormat="dd/MM/yyyy"
  locale={fr}
  placeholderText="Date de fin"
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

const hasProjects =
  ongoingEvents.length > 0 || upcomingEvents.length > 0;

return (
  <div style={page}>

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

<DatePicker
  selected={stringToDate(startDate)}
  onChange={(date: Date | null) => {
    if (!date) return;

    const value = dateToString(date);
    setStartDate(value);

    if (endDate && value > endDate) {
      setEndDate("");
    }
  }}
  dateFormat="dd/MM/yyyy"
  locale={fr}
  placeholderText="Date de début"
/>

<DatePicker
  selected={stringToDate(endDate)}
  onChange={(date: Date | null) => {
    if (!date) return;
    setEndDate(dateToString(date));
  }}
  minDate={stringToDate(startDate) || undefined}
  dateFormat="dd/MM/yyyy"
  locale={fr}
  placeholderText="Date de fin"
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



{!hasProjects ? (
  <div
    style={{
      minHeight: "60vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
      gap: 20,
    }}
  >
    <p
      style={{
        fontSize: 22,
        fontWeight: 600,
        color: "#6E8570",
        margin: 0,
      }}
    >
      Vous n'avez aucun projet en cours ou à venir.
    </p>

    <button onClick={() => setShowForm(true)} style={btn}>
      Nouveau projet
    </button>
  </div>
) : (
  <>
    {ongoingEvents.length > 0 && (
      <>
        <h2 style={sectionTitle}>Projets en cours</h2>
        {ongoingEvents.map((event) => renderEventCard(event))}
      </>
    )}

    {upcomingEvents.length > 0 && (
      <>
        <h2 style={sectionTitle}>Projets à venir</h2>
        {upcomingEvents.map((event) => renderEventCard(event))}
      </>
    )}
  </>
)}
  </div>
);
}

const btn = {
  padding: "11px 18px",
  background: "#222222",
  color: "#FAFAF8",
  border: "none",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 600,
};

const emptyDashboard = {
  minHeight: "60vh",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center" as const,
  gap: 20,
};

const emptyDashboardText = {
  fontSize: 22,
  fontWeight: 600,
  color: "#6E8570",
  margin: 0,
};

const input = {
  width: "100%",
  padding: 12,
  marginTop: 10,
  border: "1px solid #D8D2C8",
  borderRadius: 10,
  background: "#FAFAF8",
  color: "#222222",
  fontSize: 15,
  fontWeight: 400,
};

const formCard = {
  marginTop: 20,
  padding: 22,
  border: "1px solid #DED8CE",
  borderRadius: 18,
  background: "#FAFAF8",
  maxWidth: 420,
  boxShadow: "0 14px 35px rgba(34,34,34,0.06)",
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
  fontSize: 18,
  fontWeight: 700,
  color: "#6E8570",
};
const page = {
  minHeight: "100vh",
  padding: 40,
  background: "#F4F1EC",
  color: "#222222",
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