"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Play, Flag, Hourglass } from "lucide-react";

export default function EventOverview() {
  const { id } = useParams();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [budgetItems, setBudgetItems] = useState<any[]>([]);
  const [todayActivities, setTodayActivities] = useState<any[]>([]);

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

const { data: eventDaysData } = await supabase
  .from("event_days")
  .select("id, date")
  .eq("event_id", id);

const todayDay = eventDaysData?.find((day) => day.date === today);

if (todayDay) {
  const { data: activitiesData, error: activitiesError } = await supabase
    .from("activities")
    .select("*")
    .eq("day_id", todayDay.id)
    .order("start_time", { ascending: true });

  if (activitiesError) {
    console.error(activitiesError.message);
  } else {
    setTodayActivities(activitiesData || []);
  }
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
  <div style={page}>
    <div style={header}>
      <h1 style={title}>{event.title}</h1>

      {event.type && <span style={typeBadge}>{event.type}</span>}
    </div>

    <div style={overviewGrid}>
      <div style={leftColumn}>
        <div style={smallCard}>
          <div style={dateRow}>
            <Play size={18} color="#6E8570" />
            <div>
              <span style={label}>Début</span>
              <p style={dateValue}>{event.start_date || "-"}</p>
            </div>
          </div>

          <div style={{ ...dateRow, marginTop: 18 }}>
            <Flag size={18} color="#6E8570" />
            <div>
              <span style={label}>Fin</span>
              <p style={dateValue}>{event.end_date || "-"}</p>
            </div>
          </div>
        </div>

        <div style={smallCard}>
          <div style={countdownRow}>
            <Hourglass size={24} color="#6E8570" />
            <p style={countdownText}>
              {getCountdownLabel(event.start_date, event.end_date)}
            </p>
          </div>
        </div>

        <div style={smallCard}>
          <div style={budgetPieWrapper}>
            <BudgetPie used={usedBudget} total={totalBudget} />

            <div>
              <p style={budgetMain}>
                {usedBudget} € / {totalBudget} €
              </p>
              <p style={label}>budget utilisé</p>
            </div>
          </div>
        </div>
      </div>

      <div style={largeCard}>
        <h3>Tâches du jour</h3>

        {todayTasks.length === 0 ? (
          <p style={mutedText}>Aucune tâche prévue aujourd’hui.</p>
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

              {task.time && <span style={metaText}>{task.time}</span>}
            </div>
          ))
        )}
      </div>

      <div style={largeCard}>
        <h3>Calendrier du jour</h3>

        {todayActivities.length === 0 ? (
          <p style={mutedText}>Aucune activité prévue aujourd’hui.</p>
        ) : (
          todayActivities.map((activity) => (
            <div key={activity.id} style={activityRow}>
              <div>
                <strong>{activity.title}</strong>

                <div style={metaText}>
                  {activity.start_time || "--"} → {activity.end_time || "--"}
                </div>
              </div>

              {activity.type && (
                <span style={activityBadge}>{activity.type}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  </div>
);
}

function BudgetPie({ used, total }: { used: number; total: number }) {
  const percent = total > 0 ? Math.min((used / total) * 100, 100) : 0;

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = (percent / 100) * circumference;

  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      <circle
        cx="55"
        cy="55"
        r={radius}
        fill="none"
        stroke="#DED8CE"
        strokeWidth="12"
      />

      <circle
        cx="55"
        cy="55"
        r={radius}
        fill="none"
        stroke="#6E8570"
        strokeWidth="12"
        strokeDasharray={`${progress} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
      />

      <text
        x="55"
        y="58"
        textAnchor="middle"
        fontSize="17"
        fontWeight="700"
        fill="#222222"
      >
        {Math.round(percent)}%
      </text>
    </svg>
  );
}

const header = {
  marginBottom: 24,
};

const title = {
  fontSize: 34,
  fontWeight: 800,
  margin: 0,
  color: "#222222",
};

const typeBadge = {
  display: "inline-block",
  marginTop: 10,
  padding: "6px 12px",
  borderRadius: 999,
  background: "#6E8570",
  color: "#FAFAF8",
  fontSize: 13,
  fontWeight: 700,
  textTransform: "capitalize" as const,
};

const overviewGrid = {
  display: "grid",
  gridTemplateColumns: "360px 0.9fr 1.1fr",
  gap: 20,
  alignItems: "stretch",
};

const leftColumn = {
  display: "grid",
  gridTemplateRows: "1fr 1fr 1fr",
  gap: 20,
};

const smallCard = {
  border: "1px solid #DED8CE",
  borderRadius: 18,
  padding: 18,
  background: "#FAFAF8",
  minHeight: 130,
  boxShadow: "0 12px 30px rgba(34,34,34,0.05)",
};

const largeCard = {
  border: "1px solid #DED8CE",
  borderRadius: 18,
  padding: 18,
  background: "#FAFAF8",
  minHeight: 430,
  boxShadow: "0 12px 30px rgba(34,34,34,0.05)",
};

const mutedText = {
  color: "#8A8A7A",
};

const metaText = {
  color: "#8A8A7A",
  fontSize: 13,
};

const taskRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 0",
  borderBottom: "1px solid #DED8CE",
  color: "#222222",
};

const activityRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: 12,
  border: "1px solid #DED8CE",
  borderRadius: 14,
  marginTop: 10,
  background: "#F4F1EC",
  color: "#222222",
};

const activityBadge = {
  height: 24,
  padding: "4px 8px",
  borderRadius: 999,
  background: "#A8BFA5",
  color: "#222222",
  fontSize: 12,
  fontWeight: 700,
};

const page = {
  minHeight: "100vh",
  background: "#F4F1EC",
  padding: "40px",
  color: "#222222",
};

const countdownRow = {
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 14,
  color: "#6E8570",
};

const dateRow = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const label = {
  display: "block",
  color: "#8A8A7A",
  fontSize: 13,
  marginBottom: 4,
};

const dateValue = {
  margin: 0,
  fontSize: 17,
  fontWeight: 700,
  color: "#222222",
};

const countdownText = {
  margin: 0,
  fontSize: 24,
  fontWeight: 800,
  color: "#6E8570",
};

const budgetPieWrapper = {
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 16,
  whiteSpace: "nowrap" as const,
};

const budgetMain = {
  margin: 0,
  fontSize: 18,
  fontWeight: 800,
  whiteSpace: "nowrap" as const,
  color: "#222222",
};