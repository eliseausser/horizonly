"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import {
  ArrowLeft,
  Home,
  CalendarDays,
  Hotel,
  Wallet,
  CheckSquare,
  Files,
  Pin,
} from "lucide-react";

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

type TabItem = {
  key: string;
  label: string;
  href: string;
  isCustom?: boolean;
};

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

  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [showCreateTab, setShowCreateTab] = useState(false);
  const [newTabTitle, setNewTabTitle] = useState("");
  const [showOtherMenu, setShowOtherMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const [contextMenu, setContextMenu] = useState<{
    tab: TabItem;
    x: number;
    y: number;
  } | null>(null);

  const [renamingTab, setRenamingTab] = useState<TabItem | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  useEffect(() => {
    loadTabs();
  }, [id]);

  function getFixedTabs(): TabItem[] {
    return [
      { key: "overview", label: "Accueil", href: `/event/${id}` },
      { key: "planning", label: "Planning", href: `/event/${id}/planning` },
      { key: "bookings", label: "Réservations", href: `/event/${id}/bookings` },
      { key: "budget", label: "Budget", href: `/event/${id}/budget` },
      { key: "todo", label: "Tâches", href: `/event/${id}/todo` },
      { key: "documents", label: "Documents", href: `/event/${id}/documents` },
    ];
  }

  async function loadTabs() {
    const { data: pagesData, error: pagesError } = await supabase
      .from("custom_pages")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: true });

    if (pagesError) {
      console.error(pagesError.message);
      return;
    }

    const customTabs: TabItem[] = (pagesData || []).map((page) => ({
      key: `custom-${page.id}`,
      label: page.title,
      href: `/event/${id}/custom/${page.id}`,
      isCustom: true,
    }));

    const allTabs = [...getFixedTabs(), ...customTabs];

    const { data: orderData, error: orderError } = await supabase
      .from("event_tab_order")
      .select("*")
      .eq("event_id", id);

    if (orderError) {
      console.error(orderError.message);
      setTabs(allTabs);
      return;
    }

    const orderMap = new Map(
      (orderData || []).map((item) => [item.tab_key, item.position])
    );

    const sortedTabs = [...allTabs].sort((a, b) => {
      const aPos = orderMap.get(a.key);
      const bPos = orderMap.get(b.key);

      if (aPos === undefined && bPos === undefined) return 0;
      if (aPos === undefined) return 1;
      if (bPos === undefined) return -1;

      return aPos - bPos;
    });

    setTabs(sortedTabs);
  }

  async function saveTabOrder(newTabs: TabItem[]) {
    const results = await Promise.all(
      newTabs.map((tab, index) =>
        supabase.from("event_tab_order").upsert(
          {
            event_id: id,
            tab_key: tab.key,
            position: index,
          },
          { onConflict: "event_id,tab_key" }
        )
      )
    );

    if (results.some((result) => result.error)) {
      console.error("saveTabOrder error:", results);
    }
  }

  async function createCustomPage() {
    if (!newTabTitle.trim()) return;

    const { data, error } = await supabase
      .from("custom_pages")
      .insert([
        {
          event_id: id,
          title: newTabTitle.trim(),
          type: "blank",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(error.message);
      return;
    }

    const newTab: TabItem = {
      key: `custom-${data.id}`,
      label: data.title,
      href: `/event/${id}/custom/${data.id}`,
      isCustom: true,
    };

    const newTabs = [...tabs, newTab];

    setTabs(newTabs);
    setNewTabTitle("");
    setShowCreateTab(false);

    await saveTabOrder(newTabs);
    router.push(`/event/${id}/custom/${data.id}`);
  }

  async function renameCustomTab() {
    if (!renamingTab || !renameValue.trim()) return;

    const pageId = renamingTab.key.replace("custom-", "");
    const cleanName = renameValue.trim();

    const { error } = await supabase
      .from("custom_pages")
      .update({ title: cleanName })
      .eq("id", pageId);

    if (error) {
      console.error(error.message);
      return;
    }

    setTabs((prev) =>
      prev.map((tab) =>
        tab.key === renamingTab.key ? { ...tab, label: cleanName } : tab
      )
    );

    setRenamingTab(null);
    setRenameValue("");
  }

  async function deleteCustomTab(tab: TabItem) {
    if (!tab.isCustom) return;

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
    setContextMenu(null);

    await saveTabOrder(updatedTabs);

    if (pathname.includes(`/custom/${pageId}`)) {
      router.push(`/event/${id}`);
    }
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

  function isActiveTab(href: string) {
    if (href === `/event/${id}`) return pathname === href;
    return pathname.includes(href);
  }

  function getTabIcon(tab: TabItem) {
    if (tab.isCustom) return Pin;

    switch (tab.key) {
      case "overview":
        return Home;
      case "planning":
        return CalendarDays;
      case "bookings":
        return Hotel;
      case "budget":
        return Wallet;
      case "todo":
        return CheckSquare;
      case "documents":
        return Files;
      default:
        return Pin;
    }
  }

return (
  <div
    onClick={() => {
      if (contextMenu) setContextMenu(null);
      if (showOtherMenu) setShowOtherMenu(false);
    }}
  >
    <div style={projectTopBar}>
      <Link href="/dashboard" style={brand}>
        <img src="/logo.svg" alt="MERGE" style={{ width: 34, height: "auto" }} />
      </Link>

      <div style={scrollTabs}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tabs.filter((tab) => !tab.isCustom).map((tab) => tab.key)}
            strategy={horizontalListSortingStrategy}
          >
            <div style={tabsList}>
              {tabs
                .filter((tab) => !tab.isCustom)
                .map((tab) => {
                  const Icon = getTabIcon(tab);

                  return (
                    <SortableTab key={tab.key} id={tab.key}>
                      <Link
                        href={tab.href}
                        style={isActiveTab(tab.href) ? activeTabStyle : tabStyle}
                      >
                        <Icon size={16} />
                        <span>{tab.label}</span>
                      </Link>
                    </SortableTab>
                  );
                })}

              <div style={{ position: "relative", flexShrink: 0 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOtherMenu(!showOtherMenu);
                  }}
                  style={otherBtn}
                >
                  Autre ▾
                </button>

                {showOtherMenu && (
                  <div style={otherMenu} onClick={(e) => e.stopPropagation()}>
                    {tabs.filter((tab) => tab.isCustom).length === 0 ? (
                      <div style={emptyOther}>Aucune page</div>
                    ) : (
                      tabs
                        .filter((tab) => tab.isCustom)
                        .map((tab) => (
                          <Link
                            key={tab.key}
                            href={tab.href}
                            onClick={() => setShowOtherMenu(false)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();

                              setContextMenu({
                                tab,
                                x: e.clientX,
                                y: e.clientY,
                              });
                            }}
                            style={
                              isActiveTab(tab.href)
                                ? activeOtherMenuItem
                                : otherMenuItem
                            }
                          >
                            {tab.label}
                          </Link>
                        ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div style={{ position: "relative", flexShrink: 0 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowCreateTab(!showCreateTab);
          }}
          style={plusBtn}
        >
          +
        </button>

        {showCreateTab && (
          <div style={createMenu} onClick={(e) => e.stopPropagation()}>
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

      <div style={{ position: "relative", flexShrink: 0 }}>
        <button
          style={accountBtn}
          onClick={(e) => {
            e.stopPropagation();
            setShowAccountMenu(!showAccountMenu);
          }}
        >
          Mon compte ▾
        </button>

        {showAccountMenu && (
          <div style={accountMenu} onClick={(e) => e.stopPropagation()}>
            <button style={accountMenuItem} onClick={() => router.push("/dashboard")}>
              Mes projets
            </button>

            <button style={accountMenuItem} onClick={() => router.push("/archives")}>
              Archives
            </button>

            <button style={accountMenuItem} onClick={() => router.push("/myaccount")}>
              Mon compte
            </button>
          </div>
        )}
      </div>
    </div>

    {contextMenu && (
      <div
        style={{
          ...contextMenuStyle,
          left: contextMenu.x,
          top: contextMenu.y,
        }}
        onClick={(e) => e.stopPropagation()}
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
          style={{ ...contextMenuItem, color: "red" }}
          onClick={() => deleteCustomTab(contextMenu.tab)}
        >
          Supprimer
        </button>

        <button style={contextMenuItem} onClick={() => setContextMenu(null)}>
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

    <div style={pageContent}>{children}</div>
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

const tabsBar = {
  padding: 15,
  borderBottom: "1px solid #DED8CE",
  position: "sticky" as const,
  top: 70,
  background: "#F4F1EC",
  zIndex: 998,
};

const tabsRow = {
  display: "flex",
  alignItems: "center",
  gap: 15,
};

const scrollTabs = {
  flex: 1,
  overflowX: "auto" as const,
  overflowY: "visible" as const,
  paddingBottom: 4,
};

const tabsList = {
  display: "flex",
  gap: 15,
};

const tabStyle = {
  padding: "8px 12px",
  borderRadius: 10,
  textDecoration: "none",
  color: "#222222",
  background: "#FAFAF8",
  border: "1px solid #DED8CE",
  display: "flex",
  alignItems: "center",
  gap: 6,
  whiteSpace: "nowrap" as const,
  fontWeight: 600,
};

const activeTabStyle = {
  ...tabStyle,
  background: "#6E8570",
  color: "#FAFAF8",
  border: "1px solid #6E8570",
};

const customTabStyle = {
  ...tabStyle,
  background: "#FAFAF8",
  color: "#6E8570",
  border: "1px solid #A8BFA5",
};

const activeCustomTabStyle = {
  ...tabStyle,
  background: "#A8BFA5",
  color: "#222222",
  border: "1px solid #A8BFA5",
};

const backButton = {
  width: 38,
  height: 38,
  borderRadius: 10,
  border: "1px solid #DED8CE",
  background: "#FAFAF8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  color: "#222222",
  flexShrink: 0,
};

const plusBtn = {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: "1px solid #DED8CE",
  background: "#FAFAF8",
  color: "#222222",
  cursor: "pointer",
  fontSize: 20,
  fontWeight: 700,
  flexShrink: 0,
};

const createMenu = {
  position: "absolute" as const,
  right: 0,
  top: 42,
  width: 260,
  padding: 12,
  border: "1px solid #DED8CE",
  borderRadius: 14,
  background: "#FAFAF8",
  boxShadow: "0 12px 30px rgba(34,34,34,0.12)",
  zIndex: 9999,
};

const accountMenu = {
  position: "absolute" as const,
  right: 0,
  top: 44,
  width: 180,
  background: "#FAFAF8",
  border: "1px solid #DED8CE",
  borderRadius: 14,
  overflow: "hidden",
  boxShadow: "0 12px 30px rgba(34,34,34,0.12)",
  zIndex: 99999,
};

const accountMenuItem = {
  width: "100%",
  border: "none",
  background: "#FAFAF8",
  color: "#222222",
  padding: "12px 16px",
  textAlign: "left" as const,
  cursor: "pointer",
  fontWeight: 600,
};

const input = {
  padding: 10,
  width: "100%",
  border: "1px solid #DED8CE",
  borderRadius: 10,
  background: "#FAFAF8",
  color: "#222222",
  boxSizing: "border-box" as const,
};

const otherBtn = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #DED8CE",
  background: "#FAFAF8",
  color: "#222222",
  cursor: "pointer",
  fontWeight: 600,
  whiteSpace: "nowrap" as const,
};

const otherMenu = {
  position: "fixed" as const,
  top: 64,
  left: "auto",
  width: 220,
  padding: 8,
  border: "1px solid #DED8CE",
  borderRadius: 14,
  background: "#FAFAF8",
  boxShadow: "0 12px 30px rgba(34,34,34,0.12)",
  zIndex: 99999,
};

const otherMenuItem = {
  display: "block",
  padding: "10px 12px",
  borderRadius: 10,
  textDecoration: "none",
  color: "#222222",
  fontWeight: 600,
};

const activeOtherMenuItem = {
  ...otherMenuItem,
  background: "#6E8570",
  color: "#FAFAF8",
};

const emptyOther = {
  padding: "10px 12px",
  color: "#8A8A7A",
  fontSize: 14,
};

const btn = {
  padding: "10px 12px",
  background: "#222222",
  color: "#FAFAF8",
  border: "none",
  borderRadius: 10,
  marginTop: 10,
  cursor: "pointer",
  width: "100%",
  fontWeight: 600,
};

const contextMenuStyle = {
  position: "fixed" as const,
  width: 180,
  background: "#FAFAF8",
  border: "1px solid #DED8CE",
  borderRadius: 12,
  boxShadow: "0 12px 30px rgba(34,34,34,0.15)",
  overflow: "hidden",
  zIndex: 99999,
};

const contextMenuItem = {
  display: "block",
  width: "100%",
  padding: "10px 12px",
  border: "none",
  background: "#FAFAF8",
  color: "#222222",
  textAlign: "left" as const,
  cursor: "pointer",
};

const modalOverlay = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(34,34,34,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 99999,
};

const modal = {
  width: 360,
  padding: 20,
  borderRadius: 16,
  background: "#FAFAF8",
  color: "#222222",
  boxShadow: "0 20px 60px rgba(34,34,34,0.25)",
};

const secondaryBtn = {
  padding: "10px 12px",
  background: "#FAFAF8",
  color: "#222222",
  border: "1px solid #DED8CE",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 600,
};

const projectTopBar = {
  height: 76,
  padding: "0 28px",
  background: "#F4F1EC",
  borderBottom: "1px solid #DED8CE",
  display: "flex",
  alignItems: "center",
  gap: 22,
  position: "sticky" as const,
  top: 0,
  zIndex: 1000,
};

const brand = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  textDecoration: "none",
  color: "#222222",
  flexShrink: 0,
};

const brandName = {
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: "-0.5px",
};

const accountBtn = {
  padding: "9px 14px",
  borderRadius: 999,
  border: "1px solid #DED8CE",
  background: "#FAFAF8",
  color: "#222222",
  cursor: "pointer",
  fontWeight: 600,
  flexShrink: 0,
};

const pageContent = {
  padding: 30,
  background: "#F4F1EC",
  minHeight: "calc(100vh - 76px)",
};