"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

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
  const router = useRouter();

  const [event, setEvent] = useState<any>(null);
  const [customPages, setCustomPages] = useState<any[]>([]);
  const [showCreateTab, setShowCreateTab] = useState(false);
  const [newTabTitle, setNewTabTitle] = useState("");

  useEffect(() => {
    async function loadData() {
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("title, type")
        .eq("id", id)
        .single();

      if (eventError) {
        console.error(eventError.message);
      } else {
        setEvent(eventData);
      }

      const { data: pagesData, error: pagesError } = await supabase
        .from("custom_pages")
        .select("*")
        .eq("event_id", id)
        .order("created_at", { ascending: true });

      if (pagesError) {
        console.error(pagesError.message);
      } else {
        setCustomPages(pagesData || []);
      }
    }

    loadData();
  }, [id]);

  async function createCustomPage() {
    if (!newTabTitle.trim()) return;

    const { data, error } = await supabase
      .from("custom_pages")
      .insert([
        {
          event_id: id,
          title: newTabTitle,
          type: "blank",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(error.message);
      return;
    }

    setCustomPages((prev) => [...prev, data]);
    setNewTabTitle("");
    setShowCreateTab(false);

    router.push(`/event/${id}/custom/${data.id}`);
  }

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
    whiteSpace: "nowrap" as const,
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

<div

  style={{
    display: "flex",
    alignItems: "center",
    gap: 15,
  }}
>
  {/* Zone scrollable des onglets */}
  <div
    style={{
      display: "flex",
      gap: 15,
      flex: 1,
      overflowX: "auto",
      paddingBottom: 4,
    }}
  >
          <Link
            href={`/event/${id}`}
            style={pathname === `/event/${id}` ? activeTab : tab}
          >
            Overview
          </Link>

          <Link
            href={`/event/${id}/planning`}
            style={
              pathname.includes(`/event/${id}/planning`) ? activeTab : tab
            }
          >
            Planning
          </Link>

          <Link
            href={`/event/${id}/bookings`}
            style={
              pathname.includes(`/event/${id}/bookings`) ? activeTab : tab
            }
          >
            Bookings
          </Link>

          <Link
            href={`/event/${id}/budget`}
            style={pathname.includes(`/event/${id}/budget`) ? activeTab : tab}
          >
            Budget
          </Link>

          <Link
            href={`/event/${id}/todo`}
            style={pathname.includes(`/event/${id}/todo`) ? activeTab : tab}
          >
            To Do List
          </Link>

          {customPages.map((page) => (
      <Link
        key={page.id}
        href={`/event/${id}/custom/${page.id}`}
        style={
          pathname.includes(`/event/${id}/custom/${page.id}`)
            ? activeTab
            : tab
        }
      >
        {page.title}
      </Link>
    ))}
  </div>

  {/* Bouton + hors du scroll */}
  <div
    style={{
      position: "relative",
      flexShrink: 0,
    }}
  >
    <button
      onClick={() => setShowCreateTab(!showCreateTab)}
      style={plusBtn}
    >
      +
    </button>

    {showCreateTab && (
      <div style={createMenu}>
        <input
          placeholder="Nom de l'onglet"
          value={newTabTitle}
          onChange={(e) => setNewTabTitle(e.target.value)}
          style={input}
        />

        <button
          onClick={createCustomPage}
          style={btn}
        >
          Créer une page vierge
        </button>
      </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: 30 }}>{children}</div>
    </div>
  );
}

const plusBtn = {
  width: 34,
  height: 34,
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
  fontSize: 20,
  flexShrink: 0,
};

const createMenu = {
  position: "absolute" as const,
  right: 0,
  top: 42,
  width: 260,
  padding: 12,
  border: "1px solid #ddd",
  borderRadius: 12,
  background: "white",
  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
  zIndex: 9999,
};

const input = {
  padding: 10,
  width: "100%",
  border: "1px solid #ddd",
  borderRadius: 8,
  boxSizing: "border-box" as const,
};

const btn = {
  padding: "10px 12px",
  background: "black",
  color: "white",
  border: "none",
  borderRadius: 8,
  marginTop: 10,
  cursor: "pointer",
  width: "100%",
};