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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleCreateEvent() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    const currentUser = session.user;

    console.log({
      title,
      type,
      startDate,
      endDate,
      budget,
    });

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
  }

  if (loading) return <p>Chargement...</p>;

  return (
    <div style={{ padding: 40 }}>
      <h1>Dashboard OK ✈️</h1>

      {/* CREATE EVENT */}
      <h2 style={{ marginTop: 30 }}>Créer un événement</h2>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre"
        style={{
          display: "block",
          marginTop: 10,
          padding: 10,
          width: 250,
        }}
      />

      <input
        value={type}
        onChange={(e) => setType(e.target.value)}
        placeholder="Type (voyage, mariage...)"
        style={{
          display: "block",
          marginTop: 10,
          padding: 10,
          width: 250,
        }}
      />

      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        style={{ display: "block", marginTop: 10 }}
      />

      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        style={{ display: "block", marginTop: 10 }}
      />

      <input
        type="number"
        value={budget}
        onChange={(e) => setBudget(e.target.value)}
        placeholder="Budget"
        style={{ display: "block", marginTop: 10 }}
      />

      <button
        onClick={handleCreateEvent}
        style={{
          marginTop: 10,
          padding: "10px 16px",
          borderRadius: 10,
          border: "none",
          background: "black",
          color: "white",
          cursor: "pointer",
        }}
      >
        Créer
      </button>

      {/* EVENTS */}
      <h2 style={{ marginTop: 30 }}>Mes événements</h2>

      {events.length === 0 ? (
        <p>Aucun événement pour le moment</p>
      ) : (
        events.map((event) => (
          <Link
            href={`/event/${event.id}`}
            key={event.id}
            style={{
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                border: "1px solid #ccc",
                padding: 12,
                marginTop: 10,
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              <h3>{event.title}</h3>
              <p>Type : {event.type}</p>

              <p>
                Dates : {event.start_date} → {event.end_date}
              </p>

              <p>Budget : {event.budget_total} €</p>
            </div>
          </Link>
        ))
      )}

      {/* LOGOUT */}
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