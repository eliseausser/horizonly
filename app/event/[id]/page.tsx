"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function EventOverview() {
  const { id } = useParams();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
const [todayTasks, setTodayTasks] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error(error.message);
        setLoading(false);
        return;
      }
const todayDate = new Date();
const today =
  todayDate.getFullYear() +
  "-" +
  String(todayDate.getMonth() + 1).padStart(2, "0") +
  "-" +
  String(todayDate.getDate()).padStart(2, "0");

const { data: listsData } = await supabase
  .from("todo_lists")
  .select("id")
  .eq("event_id", id);

const listIds = listsData?.map((list) => list.id) || [];

if (listIds.length > 0) {
  const { data: tasksData, error: tasksError } = await supabase
    .from("todo_tasks")
    .select("*")
    .in("list_id", listIds)
    .eq("date", today)
    .order("created_at", { ascending: true });

  if (tasksError) {
    console.error(tasksError.message);
  } else {
    setTodayTasks(tasksData || []);
  }
}

      setEvent(data);
      setLoading(false);
    }

    load();
  }, [id]);

  function getDaysUntilEvent(startDate: string) {
    const today = new Date();
    const eventDate = new Date(startDate);

    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);

    const diff = eventDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  if (loading) return <p>Chargement...</p>;

  if (!event) return <p>Event introuvable</p>;

  return (
    <div>

      <div
        style={{
          marginTop: 20,
          display: "flex",
          gap: 20,
          alignItems: "stretch",
        }}
      >
        <div style={card}>
          <h3>📅 Dates</h3>
          <p>
            {event.start_date} → {event.end_date}
          </p>
        </div>

        <div style={card}>
          <h3>💰 Budget</h3>
          <p>{event.budget_total} €</p>
        </div>

<div style={card}>
  <h3>✅ To Do du jour</h3>

  {todayTasks.length === 0 ? (
    <p>Aucune tâche prévue aujourd’hui.</p>
  ) : (
    todayTasks.map((task) => (
      <div key={task.id} style={taskRow}>
        <span
          style={{
            textDecoration: task.done ? "line-through" : "none",
            opacity: task.done ? 0.5 : 1,
          }}
        >
          {task.title}
        </span>

        {task.time && (
          <span style={{ color: "#666", fontSize: 13 }}>
            {task.time}
          </span>
        )}
      </div>
    ))
  )}
</div>

        {event?.start_date && (
          <div style={card}>
            <h3>⏳ Compte à rebours</h3>
            <p
              style={{
                fontSize: 28,
                fontWeight: "bold",
                margin: 0,
                textAlign: "center",
              }}
            >
              J-{getDaysUntilEvent(event.start_date)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const card = {
  border: "1px solid #ddd",
  padding: 15,
  borderRadius: 10,
  width: 240,
  minHeight: 140,
  background: "white",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "flex-start",
};

const taskRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "8px 0",
  borderBottom: "1px solid #eee",
};