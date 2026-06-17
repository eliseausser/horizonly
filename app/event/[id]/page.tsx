"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function EventOverview() {
  const { id } = useParams();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [budgetItems, setBudgetItems] = useState<any[]>([]);

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

      setEvent(data);

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
      } else {
        setTodayTasks([]);
      }

      const { data: budgetData, error: budgetError } = await supabase
        .from("budget_items")
        .select("amount")
        .eq("event_id", id);

      if (budgetError) {
        console.error(budgetError.message);
      } else {
        setBudgetItems(budgetData || []);
      }

      setLoading(false);
    }

    load();
  }, [id]);

  function getCountdownLabel(startDate: string, endDate: string) {
    if (!startDate) return "-";

    const today = new Date();
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(startDate);

    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (today < start) {
      const diff = start.getTime() - today.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return `J-${days}`;
    }

    if (today >= start && today <= end) {
      return "En cours";
    }

    const diff = today.getTime() - end.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return `J+${days}`;
  }

  if (loading) return <p>Chargement...</p>;

  if (!event) return <p>Event introuvable</p>;

  const totalBudget = Number(event?.budget_total || 0);

  const usedBudget = budgetItems.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  return (
    <div>
<div
  style={{
    marginBottom: 28,
  }}
>
  <h1
    style={{
      fontSize: 34,
      fontWeight: 700,
      margin: 0,
      color: "#111",
    }}
  >
    {event.title}
  </h1>

  {event.type && (
    <span
      style={{
        display: "inline-block",
        marginTop: 10,
        padding: "6px 12px",
        borderRadius: 999,
        background:
          event.type === "voyage"
            ? "#22c55e"
            : event.type === "evenement"
            ? "#3b82f6"
            : "#6b7280",
        color: "white",
        fontSize: 13,
        fontWeight: 600,
        textTransform: "capitalize",
      }}
    >
      {event.type}
    </span>
  )}
</div>
      <div style={cardsWrapper}>
        <div style={card}>
          <h3>📅 Dates</h3>

          <p style={mainText}>
            {event.start_date || "-"} → {event.end_date || "-"}
          </p>
        </div>

        <div style={card}>
          <h3>💰 Budget</h3>

          <p style={mainText}>
            {usedBudget} €/{totalBudget} €
          </p>
        </div>

        <div style={card}>
          <h3>✅ To Do du jour</h3>

          {todayTasks.length === 0 ? (
            <p style={smallText}>Aucune tâche prévue aujourd’hui.</p>
          ) : (
            <div>
              {todayTasks.map((task) => (
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
              ))}
            </div>
          )}
        </div>

        <div style={card}>
          <h3>⏳ Compte à rebours</h3>

          <p style={mainText}>
            {getCountdownLabel(event.start_date, event.end_date)}
          </p>
        </div>
      </div>
    </div>
  );
}

const cardsWrapper = {
  marginTop: 20,
  display: "flex",
  gap: 20,
  alignItems: "stretch",
  flexWrap: "wrap" as const,
};

const card = {
  border: "1px solid #ddd",
  padding: 15,
  borderRadius: 10,
  width: 260,
  minHeight: 140,
  background: "white",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "flex-start",
};

const mainText = {
  fontSize: 18,
  margin: 0,
  textAlign: "center" as const,
  fontWeight: 400,
};

const smallText = {
  color: "#666",
  margin: 0,
};

const taskRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "8px 0",
  borderBottom: "1px solid #eee",
};