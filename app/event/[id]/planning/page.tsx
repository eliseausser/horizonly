"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";

import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

export default function Planning() {
  const { id } = useParams();

  const [days, setDays] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activityTitle, setActivityTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "timeline" | "gantt">("list");

  // ✅ EDIT STATE
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (!editingId) {
      setEditTitle("");
      setEditDate("");
      setEditStart("");
      setEditEnd("");
    }
  }, [editingId]);

  async function loadData() {
    const { data: daysData } = await supabase
      .from("event_days")
      .select("*")
      .eq("event_id", id)
      .order("day_number", { ascending: true });

    setDays(daysData || []);

    const { data: activitiesData } = await supabase
      .from("activities")
      .select("*")
      .order("position", { ascending: true });

    setActivities(activitiesData || []);
    setLoading(false);
  }

  async function addDay() {
    await supabase.from("event_days").insert([
      {
        event_id: id,
        day_number: days.length + 1,
      },
    ]);

    await loadData();
  }

  async function addActivity(dayId: string) {
    if (!activityTitle) return;

    const { data, error } = await supabase
      .from("activities")
      .insert([
        {
          day_id: dayId,
          title: activityTitle,
          start_time: startTime || null,
          end_time: endTime || null,
          position: activities.length,
        },
      ])
      .select()
      .single();

    if (error) return console.error(error.message);

    setActivities((prev) => [...prev, data]);

    setActivityTitle("");
    setStartTime("");
    setEndTime("");
    setSelectedDay(null);
  }

  async function deleteActivity(activityId: string) {
    const { error } = await supabase
      .from("activities")
      .delete()
      .eq("id", activityId);

    if (error) return console.error(error.message);

    setActivities((prev) =>
      prev.filter((a) => a.id !== activityId)
    );
  }

  async function updateActivity(activityId: string, payload: any) {
    const { data, error } = await supabase
      .from("activities")
      .update(payload)
      .eq("id", activityId)
      .select()
      .single();

    if (error) return console.error(error.message);

    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? data : a))
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = activities.findIndex((a) => a.id === active.id);
    const newIndex = activities.findIndex((a) => a.id === over.id);

    const newArray = arrayMove(activities, oldIndex, newIndex);

    setActivities(newArray);

    await Promise.all(
      newArray.map((activity, index) =>
        supabase
          .from("activities")
          .update({ position: index })
          .eq("id", activity.id)
      )
    );
  }

  const hourToPx = (time: string) => {
    if (!time) return 0;
    const [h, m] = time.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    return h * 60 + m;
  };

  if (loading) return <p>Chargement...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>📅 Planning</h1>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setView("list")} style={btn}>List</button>
        <button onClick={() => setView("timeline")} style={btn}>Timeline</button>
        <button onClick={() => setView("gantt")} style={btn}>Gantt</button>
      </div>

      <button onClick={addDay} style={btn}>+ Ajouter un jour</button>

      {/* LIST */}
      {view === "list" && (
        <>
          {days.map((day) => {
            const dayActivities = activities.filter(
              (a) => a.day_id === day.id
            );

            return (
              <div key={day.id} style={card}>
                <h3>Jour {day.day_number}</h3>

                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={dayActivities.map((a) => a.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {dayActivities.map((act) => (
                      <SortableItem
                        key={act.id}
                        activity={act}
                        onDelete={deleteActivity}
                        onUpdate={updateActivity}
                        editingId={editingId}
                        setEditingId={setEditingId}
                        editTitle={editTitle}
                        setEditTitle={setEditTitle}
                        editDate={editDate}
                        setEditDate={setEditDate}
                        editStart={editStart}
                        setEditStart={setEditStart}
                        editEnd={editEnd}
                        setEditEnd={setEditEnd}
                      />
                    ))}
                  </SortableContext>
                </DndContext>

                <button
                  onClick={() => setSelectedDay(day.id)}
                  style={smallBtn}
                >
                  + activité
                </button>

                {selectedDay === day.id && (
                  <div style={{ marginTop: 10 }}>
                    <input
                      placeholder="Titre"
                      value={activityTitle}
                      onChange={(e) => setActivityTitle(e.target.value)}
                      style={input}
                    />

                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      style={input}
                    />

                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      style={input}
                    />

                    <button onClick={() => addActivity(day.id)} style={btn}>
                      Ajouter
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

/* ================= SORTABLE ITEM ================= */

function SortableItem({
  activity,
  onDelete,
  onUpdate,
  editingId,
  setEditingId,
  editTitle,
  setEditTitle,
  editDate,
  setEditDate,
  editStart,
  setEditStart,
  editEnd,
  setEditEnd,
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: activity.id });

  const isEditing = editingId === activity.id;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        padding: 10,
        marginTop: 5,
        background: "#f5f5f5",
        borderRadius: 8,
      }}
      {...attributes}
    >
      <div {...listeners}>
        ⏰ {activity.start_time || "--"} → {activity.end_time || "--"} |{" "}
        {activity.title}
      </div>

      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <button
          style={smallBtn}
          onClick={() => {
            setEditingId(activity.id);
            setEditTitle(activity.title || "");
            setEditDate(activity.date || "");
            setEditStart(activity.start_time || "");
            setEditEnd(activity.end_time || "");
          }}
        >
          ✏️ Edit
        </button>

        <button
          style={{ ...smallBtn, background: "red", color: "white" }}
          onClick={() => onDelete(activity.id)}
        >
          Delete
        </button>
      </div>

      {/* EDIT FORM */}
      {isEditing && (
        <div style={{ marginTop: 10 }}>
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            style={input}
          />

          <input
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            style={input}
          />

          <input
            type="time"
            value={editStart}
            onChange={(e) => setEditStart(e.target.value)}
            style={input}
          />

          <input
            type="time"
            value={editEnd}
            onChange={(e) => setEditEnd(e.target.value)}
            style={input}
          />

          <button
            style={btn}
            onClick={() =>
              onUpdate(activity.id, {
                title: editTitle,
                date: editDate,
                start_time: editStart,
                end_time: editEnd,
              }).then(() => setEditingId(null))
            }
          >
            Save
          </button>

          <button
            style={smallBtn}
            onClick={() => setEditingId(null)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const card = {
  border: "1px solid #ddd",
  padding: 15,
  marginTop: 10,
  borderRadius: 10,
};

const btn = {
  padding: "10px 15px",
  background: "black",
  color: "white",
  border: "none",
  borderRadius: 8,
};

const smallBtn = {
  padding: "5px 10px",
  marginTop: 10,
  border: "1px solid #ddd",
  borderRadius: 6,
};

const input = {
  display: "block",
  marginTop: 10,
  padding: 8,
  width: 200,
};