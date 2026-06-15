"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import TopBar from "@/app/components/TopBar";
import { supabase } from "@/lib/supabase";

import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

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
  const [tabs, setTabs] = useState<any[]>([]);

  const [showCreateTab, setShowCreateTab] = useState(false);
  const [newTabTitle, setNewTabTitle] = useState("");
const [renamingTab, setRenamingTab] = useState<any | null>(null);
const [renameValue, setRenameValue] = useState("");
const [contextMenu, setContextMenu] = useState<{
  tab: any;
  x: number;
  y: number;
} | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    const { data: eventData } = await supabase
      .from("events")
      .select("title, type")
      .eq("id", id)
      .single();

    setEvent(eventData);

    const { data: pagesData } = await supabase
      .from("custom_pages")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: true });

    setCustomPages(pagesData || []);

    const fixedTabs = [
      { key: "overview", label: "Overview", href: `/event/${id}` },
      { key: "planning", label: "Planning", href: `/event/${id}/planning` },
      { key: "bookings", label: "Bookings", href: `/event/${id}/bookings` },
      { key: "budget", label: "Budget", href: `/event/${id}/budget` },
      { key: "todo", label: "To Do List", href: `/event/${id}/todo` },
    ];

    const customTabs = (pagesData || []).map((page) => ({
      key: `custom-${page.id}`,
      label: page.title,
      href: `/event/${id}/custom/${page.id}`,
    }));

    const allTabs = [...fixedTabs, ...customTabs];

    const { data: orderData } = await supabase
      .from("event_tab_order")
      .select("*")
      .eq("event_id", id);

    const orderMap = new Map(
      (orderData || []).map((item) => [item.tab_key, item.position])
    );

    const sortedTabs = allTabs.sort((a, b) => {
      const aPos = orderMap.get(a.key);
      const bPos = orderMap.get(b.key);

      if (aPos === undefined && bPos === undefined) return 0;
      if (aPos === undefined) return 1;
      if (bPos === undefined) return -1;

      return aPos - bPos;
    });

    setTabs(sortedTabs);
  }

async function renameCustomTab() {
  if (!renamingTab || !renameValue.trim()) return;

  const pageId = renamingTab.key.replace("custom-", "");

  const { error } = await supabase
    .from("custom_pages")
    .update({ title: renameValue })
    .eq("id", pageId);

  if (error) {
    console.error(error.message);
    return;
  }

  setTabs((prev) =>
    prev.map((tab) =>
      tab.key === renamingTab.key ? { ...tab, label: renameValue } : tab
    )
  );

  setCustomPages((prev) =>
    prev.map((page) =>
      page.id === pageId ? { ...page, title: renameValue } : page
    )
  );

  setRenamingTab(null);
  setRenameValue("");
}

async function deleteCustomTab(tab: any) {
  const pageId = tab.key.replace("custom-", "");

  const { error } = await supabase
    .from("custom_pages")
    .delete()
    .eq("id", pageId);

  if (error) {
    console.error(error.message);
    return;
  }

  const updatedTabs = tabs.filter((item) => item.key !== tab.key);

  setTabs(updatedTabs);
  setCustomPages((prev) => prev.filter((page) => page.id !== pageId));
  setContextMenu(null);

  await saveTabOrder(updatedTabs);

  if (pathname.includes(`/custom/${pageId}`)) {
    router.push(`/event/${id}`);
  }
}  

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

    const newTab = {
      key: `custom-${data.id}`,
      label: data.title,
      href: `/event/${id}/custom/${data.id}`,
    };

    const newTabs = [...tabs, newTab];

    setCustomPages((prev) => [...prev, data]);
    setTabs(newTabs);
    setNewTabTitle("");
    setShowCreateTab(false);

    await saveTabOrder(newTabs);

    router.push(`/event/${id}/custom/${data.id}`);
  }

  async function saveTabOrder(newTabs: any[]) {
    await Promise.all(
      newTabs.map((tab, index) =>
        supabase.from("event_tab_order").upsert(
          {
            event_id: id,
            tab_key: tab.key,
            position: index,
          },
          {
            onConflict: "event_id,tab_key",
          }
        )
      )
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = tabs.findIndex((tab) => tab.key === active.id);
    const newIndex = tabs.findIndex((tab) => tab.key === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newTabs = arrayMove(tabs, oldIndex, newIndex);

    setTabs(newTabs);
    await saveTabOrder(newTabs);
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

  function isActiveTab(href: string) {
    if (href === `/event/${id}`) {
      return pathname === href;
    }

    return pathname.includes(href);
  }

  const tabStyle = {
    padding: "8px 12px",
    borderRadius: 8,
    textDecoration: "none",
    color: "#555",
    whiteSpace: "nowrap" as const,
    display: "inline-block",
  };

  const activeTabStyle = {
    ...tabStyle,
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

        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <div
            style={{
              flex: 1,
              overflowX: "auto",
              paddingBottom: 4,
            }}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={tabs.map((tab) => tab.key)}
                strategy={horizontalListSortingStrategy}
              >
                <div style={{ display: "flex", gap: 15 }}>
                  {tabs.map((tab) => (
  <SortableTab key={tab.key} id={tab.key}>
    <Link
      href={tab.href}
      onContextMenu={(e) => {
        if (!tab.key.startsWith("custom-")) return;

        e.preventDefault();

        setContextMenu({
          tab,
          x: e.clientX,
          y: e.clientY,
        });
      }}
      style={isActiveTab(tab.href) ? activeTabStyle : tabStyle}
    >
      {tab.label}
    </Link>
  </SortableTab>
))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <div style={{ position: "relative", flexShrink: 0 }}>
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

                <button onClick={createCustomPage} style={btn}>
                  Créer une page vierge
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
{contextMenu && (
  <div
    style={{
      ...contextMenuStyle,
      left: contextMenu.x,
      top: contextMenu.y,
    }}
  >
    
<button
  style={contextMenuItem}
  onClick={() => {
    setRenamingTab(contextMenu.tab);
    setRenameValue(contextMenu.tab.label);
    setContextMenu(null);
  }}
>
  Renommer
</button>
<button
      style={contextMenuItem}
      onClick={() => deleteCustomTab(contextMenu.tab)}
    >
      Supprimer
    </button>

    <button
      style={contextMenuItem}
      onClick={() => setContextMenu(null)}
    >
      Annuler
    </button>
  </div>
)}
{renamingTab && (
  <div style={modalOverlay}>
    <div style={modal}>
      <h3>Renommer l’onglet</h3>

      <input
        value={renameValue}
        onChange={(e) => setRenameValue(e.target.value)}
        style={input}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button onClick={renameCustomTab} style={btn}>
          Enregistrer
        </button>

        <button
          onClick={() => {
            setRenamingTab(null);
            setRenameValue("");
          }}
          style={secondaryBtn}
        >
          Annuler
        </button>
      </div>
    </div>
  </div>
)}
      <div style={{ padding: 30 }}>{children}</div>
    </div>
  );
}

function SortableTab({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        cursor: "grab",
        display: "inline-flex",
      }}
      {...attributes}
      {...listeners}
    >
      {children}
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

const contextMenuStyle = {
  position: "fixed" as const,
  width: 180,
  background: "white",
  border: "1px solid #ddd",
  borderRadius: 10,
  boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
  overflow: "hidden",
  zIndex: 99999,
};

const contextMenuItem = {
  display: "block",
  width: "100%",
  padding: "10px 12px",
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
  zIndex: 99999,
};

const modal = {
  width: 360,
  padding: 20,
  borderRadius: 14,
  background: "white",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};

const secondaryBtn = {
  padding: "10px 12px",
  background: "white",
  color: "black",
  border: "1px solid #ddd",
  borderRadius: 8,
  cursor: "pointer",
};