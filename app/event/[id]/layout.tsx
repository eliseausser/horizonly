"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import TopBar from "@/app/components/TopBar";
import { supabase } from "@/lib/supabase";

export default function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();

  const [event, setEvent] = useState<any>(null);

  useEffect(() => {
    async function loadEvent() {
      const { data, error } = await supabase
        .from("events")
        .select("title, type")
        .eq("id", id)
        .single();

      if (error) {
        console.error(error.message);
        return;
      }

      setEvent(data);
    }

    loadEvent();
  }, [id]);

  function getTypeColor(type: string) {
    switch (type?.toLowerCase()) {
      case "voyage":
        return "#22c55e";
      case "evenement":
        return "#3b82f6";
      default:
        return "#6b7280";
    }
  }

  const tab = {
    padding: "8px 12px",
    borderRadius: 8,
    textDecoration: "none",
    color: "#555",
  };

  const activeTab = {
    ...tab,
    background: "black",
    color: "white",
  };

  return (
    <div>
      <TopBar />

      <div
        style={{
          padding: 15,
          borderBottom: "1px solid #ddd",
          position: "sticky",
          top: 70,
          background: "white",
          zIndex: 998,
        }}
      >
        <h2 style={{ marginBottom: 8, fontSize: 28, fontWeight: "bold" }}>
          {event?.title || "Chargement..."}
        </h2>

        {event?.type && (
          <div style={{ marginBottom: 15 }}>
            <span
              style={{
                display: "inline-block",
                padding: "5px 12px",
                borderRadius: 999,
                background: getTypeColor(event.type),
                color: "white",
                fontSize: 12,
                fontWeight: "bold",
                textTransform: "capitalize",
              }}
            >
              {event.type}
            </span>
          </div>
        )}

        <div style={{ display: "flex", gap: 15 }}>
          <Link href={`/event/${id}`} style={pathname === `/event/${id}` ? activeTab : tab}>
            Overview
          </Link>

          <Link
            href={`/event/${id}/planning`}
            style={pathname.includes(`/event/${id}/planning`) ? activeTab : tab}
          >
            Planning
          </Link>

          <Link
            href={`/event/${id}/reservations`}
            style={pathname.includes(`/event/${id}/reservations`) ? activeTab : tab}
          >
            Reservations
          </Link>

          <Link
            href={`/event/${id}/budget`}
            style={pathname.includes(`/event/${id}/budget`) ? activeTab : tab}
          >
            Budget
          </Link>

<Link
  href={`/event/${id}/todo`}
  style={
    pathname.includes(`/event/${id}/todo`)
      ? activeTab
      : tab
  }
>
  Liste de taches
</Link>
        </div>
      </div>

      <div style={{ padding: 30 }}>{children}</div>
    </div>
  );
}