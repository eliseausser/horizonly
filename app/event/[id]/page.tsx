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
        return;
      }

      setEvent(data);
      setLoading(false);
    }

    load();
  }, [id]);

  if (loading) return <p>Chargement...</p>;

  if (!event) return <p>Event introuvable</p>;

  return (
    <div>
      <h1 style={{ fontSize: 28 }}>
        {event.title}
      </h1>

      <p>Type : {event.type}</p>

      <div style={{ marginTop: 20, display: "flex", gap: 20 }}>
        <div style={card}>
          <h3>📅 Dates</h3>
          <p>{event.start_date} → {event.end_date}</p>
        </div>

        <div style={card}>
          <h3>💰 Budget</h3>
          <p>{event.budget_total} €</p>
        </div>
      </div>
    </div>
  );
}

const card = {
  border: "1px solid #ddd",
  padding: 15,
  borderRadius: 10,
  width: 200,
};