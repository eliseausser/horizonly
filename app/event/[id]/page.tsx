"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function EventOverview() {
  const { id } = useParams();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
  width: 220,
  minHeight: 120,
  background: "white",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between",
};