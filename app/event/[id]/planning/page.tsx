"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

import {
  DndContext,
  closestCorners,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
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

  const [activeActivity, setActiveActivity] = useState<any | null>(null);
  const [activeDragType, setActiveDragType] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [activityTitle, setActivityTitle] = useState("");
  const [activityStart, setActivityStart] = useState("");
  const [activityEnd, setActivityEnd] = useState("");

  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
const [activityType, setActivityType] = useState("activite");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    const { data: daysData } = await supabase
      .from("event_days")
      .select("*")
      .eq("event_id", id)
      .order("day_number", { ascending: true });

    const { data: activitiesData } = await supabase
      .from("activities")
      .select("*")
      .order("position", { ascending: true });

    setDays(daysData || []);
    setActivities(activitiesData || []);
    setLoading(false);
  }

  function resetDrag() {
    setActiveActivity(null);
    setActiveDragType(null);
  }

  function handleDragStart(event: DragStartEvent) {
    const type = event.active.data.current?.type || null;
    setActiveDragType(type);

    const activity = activities.find((a) => a.id === event.active.id);
    setActiveActivity(activity || null);
  }

  function handleDragOver(event: DragOverEvent) {
    return;
  }

async function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;

  if (!over) {
    resetDrag();
    return;
  }

  const activeId = active.id;
  const overId = over.id;

  const activeType = active.data.current?.type;
  const overType = over.data.current?.type;

  // =========================
  // DRAG DES JOURS
  // =========================
  if (activeType === "day") {
    const overDayId =
      overType === "day" ? overId : over.data.current?.dayId;

    if (!overDayId) {
      resetDrag();
      return;
    }

    const oldIndex = days.findIndex((d) => d.id === activeId);
    const newIndex = days.findIndex((d) => d.id === overDayId);

    if (oldIndex === -1 || newIndex === -1) {
      resetDrag();
      return;
    }

    const newDays = arrayMove(days, oldIndex, newIndex);
    setDays(newDays);

const results = await Promise.all(
  newDays.map((day, index) =>
    supabase
      .from("event_days")
      .update({ day_number: index + 1 })
      .eq("id", day.id)
  )
);

const hasError = results.some((r) => r.error);

if (hasError) {
  console.error("drag days update error:", results);
  resetDrag();
  return;
}

resetDrag();
await loadData();
return;
  }

  // =========================
  // DRAG DES ACTIVITÉS
  // =========================
  if (activeType === "activity") {
    const activeActivity = activities.find((a) => a.id === activeId);
    if (!activeActivity) {
      resetDrag();
      return;
    }

    const overActivity = activities.find((a) => a.id === overId);
    const overDayId = over.data.current?.dayId;

    const sourceDayId = activeActivity.day_id;
    const targetDayId = overActivity
      ? overActivity.day_id
      : overDayId || sourceDayId;

    const sourceActivities = activities
      .filter((a) => a.day_id === sourceDayId && a.id !== activeId)
      .sort((a, b) => a.position - b.position);

    const targetActivities =
      sourceDayId === targetDayId
        ? sourceActivities
        : activities
            .filter((a) => a.day_id === targetDayId)
            .sort((a, b) => a.position - b.position);

    let insertIndex = targetActivities.length;

    if (overActivity) {
      insertIndex = targetActivities.findIndex((a) => a.id === overId);
      if (insertIndex === -1) insertIndex = targetActivities.length;
    }

    const movedActivity = {
      ...activeActivity,
      day_id: targetDayId,
    };

    const newTargetActivities = [
      ...targetActivities.slice(0, insertIndex),
      movedActivity,
      ...targetActivities.slice(insertIndex),
    ].map((activity, index) => ({
      ...activity,
      position: index,
    }));

    const newSourceActivities =
      sourceDayId === targetDayId
        ? []
        : sourceActivities.map((activity, index) => ({
            ...activity,
            position: index,
          }));

    const updatedActivities = activities.map((activity) => {
      const updatedTarget = newTargetActivities.find(
        (a) => a.id === activity.id
      );

      const updatedSource = newSourceActivities.find(
        (a) => a.id === activity.id
      );

      return updatedTarget || updatedSource || activity;
    });

    setActivities(updatedActivities);

const results = await Promise.all(
  updatedActivities.map((activity) =>
    supabase
      .from("activities")
      .update({
        day_id: activity.day_id,
        position: activity.position,
      })
      .eq("id", activity.id)
  )
);

const hasError = results.some((r) => r.error);

if (hasError) {
  console.error("drag activities update error:", results);
  resetDrag();
  return;
}

resetDrag();
await loadData();
  }
}

  async function addDay() {
    const { error } = await supabase.from("event_days").insert([
      {
        event_id: id,
        day_number: days.length + 1,
      },
    ]);

    if (error) {
      console.error("addDay error:", error.message);
      return;
    }

    await loadData();
  }

  async function deleteDay(dayId: string) {
    await supabase.from("activities").delete().eq("day_id", dayId);
    await supabase.from("event_days").delete().eq("id", dayId);
    await loadData();
  }

async function addActivity(dayId: string) {
  console.log("CREATE CLICKED", {
    dayId,
    activityTitle,
    activityType,
    activityStart,
    activityEnd,
  });

  if (!activityTitle.trim()) {
    console.log("Titre manquant");
    return;
  }

  const { data: currentActivities, error: readError } = await supabase
    .from("activities")
    .select("*")
    .eq("day_id", dayId);

  if (readError) {
    console.error("read activities error:", readError);
    return;
  }

  const { data, error } = await supabase
    .from("activities")
    .insert([
      {
        day_id: dayId,
        title: activityTitle,
        type: activityType,
        start_time: activityStart || null,
        end_time: activityEnd || null,
        position: currentActivities?.length || 0,
      },
    ])
    .select();

  if (error) {
    console.error("addActivity error:", error);
    return;
  }

  console.log("activity created:", data);

  setActivityTitle("");
  setActivityStart("");
  setActivityEnd("");
  setActivityType("activite");
  setSelectedDay(null);

  await loadData();
}

async function deleteActivity(activityId: string) {
  try {
    console.log("DELETE ACTIVITY:", activityId);

    const { error } = await supabase
      .from("activities")
      .delete()
      .eq("id", activityId);

    if (error) {
      console.error("deleteActivity Supabase error:", error);
      return;
    }

    await loadData();
  } catch (err) {
    console.error("deleteActivity fetch error:", err);
  }
}

async function updateActivity(activityId: string) {
  if (!editTitle.trim()) return;

  const { error } = await supabase
    .from("activities")
    .update({
      title: editTitle,
      start_time: editStart || null,
      end_time: editEnd || null,
    })
    .eq("id", activityId);

  if (error) {
    console.error("updateActivity error:", error.message);
    return;
  }

  setEditingActivityId(null);
  setEditTitle("");
  setEditStart("");
  setEditEnd("");

  await loadData();
}

  if (loading) return <p>Chargement...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>📅 Planning</h1>

      <button onClick={addDay} style={btn}>
        + Ajouter un jour
      </button>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={days.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {days.map((day, index) => {
            const dayActivities = activities
              .filter((a) => a.day_id === day.id)
              .sort((a, b) => a.position - b.position);

            return (
              <SortableDay key={day.id} id={day.id}>
                <DayContainer
                  dayId={day.id}
                  disabled={activeDragType === "day"}
                >
                  <div style={card}>
                    <h3>Jour {index + 1}</h3>

                    <SortableContext
                      items={dayActivities.map((a) => a.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {dayActivities.map((act) => (
                        <SortableItem
  key={act.id}
  activity={act}
  editingActivityId={editingActivityId}
  setEditingActivityId={setEditingActivityId}
  editTitle={editTitle}
  setEditTitle={setEditTitle}
  editStart={editStart}
  setEditStart={setEditStart}
  editEnd={editEnd}
  setEditEnd={setEditEnd}
  updateActivity={updateActivity}
  deleteActivity={deleteActivity}
/>
                      ))}
                    </SortableContext>

<button
  onClick={() =>
    setSelectedDay(selectedDay === day.id ? null : day.id)
  }
  style={btn}
>
  Ajouter une activité
</button>

{selectedDay === day.id && (
  <div style={formBox}>
    <input
      placeholder="Titre de l'activité"
      value={activityTitle}
      onChange={(e) => setActivityTitle(e.target.value)}
      style={input}
    />

    <input
      type="time"
      value={activityStart}
      onChange={(e) => setActivityStart(e.target.value)}
      style={input}
    />

    <input
      type="time"
      value={activityEnd}
      onChange={(e) => setActivityEnd(e.target.value)}
      style={input}
    />

<select
  value={activityType}
  onChange={(e) => setActivityType(e.target.value)}
  style={input}
>
  <option value="activite">Activité</option>
  <option value="rdv">RDV</option>
  <option value="evenement">Événement</option>
</select>

    <button onClick={() => addActivity(day.id)} style={btn}>
      Créer
    </button>
  </div>
)}

                    <button
                      onClick={() => deleteDay(day.id)}
                      style={{ ...btn, background: "red" }}
                    >
                      supprimer jour
                    </button>
                  </div>
                </DayContainer>
              </SortableDay>
            );
          })}
        </SortableContext>

        <DragOverlay>
          {activeActivity ? (
            <div style={dragOverlayCard}>{activeActivity.title}</div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function DayContainer({ dayId, disabled, children }: any) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-drop-${dayId}`,
    disabled,
    data: {
      type: "day-drop",
      dayId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 120,
        padding: 10,
        marginTop: 10,
        borderRadius: 10,
        background: isOver ? "#e3f2fd" : "white",
        border: "1px solid #ddd",
      }}
    >
      {children}
    </div>
  );
}

function SortableDay({ id, children }: any) {
  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({
      id,
      data: { type: "day" },
    });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition || "transform 200ms ease",
      }}
    >
      <div
        {...attributes}
        {...listeners}
        style={{
          cursor: "grab",
          padding: 8,
          background: "#eee",
          marginTop: 10,
          borderRadius: 6,
        }}
      >
        ☰ Jour
      </div>

      {children}
    </div>
  );
}

function SortableItem({
  activity,
  editingActivityId,
  setEditingActivityId,
  editTitle,
  setEditTitle,
  editStart,
  setEditStart,
  editEnd,
  setEditEnd,
  updateActivity,
  deleteActivity,
}: any) {
  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({
      id: activity.id,
      data: { type: "activity" },
    });

  const isEditing = editingActivityId === activity.id;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition || "transform 200ms ease",
        padding: 10,
        marginTop: 8,
        background: "#f2f2f2",
        borderRadius: 8,
      }}
    >
<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  }}
>
  <div {...listeners} style={{ cursor: "grab", flex: 1 }}>
    ⏰ {activity.start_time || "--"} → {activity.end_time || "--"} |{" "}
    {activity.title}
  </div>

  <div style={{ display: "flex", gap: 8 }}>
    <button
      style={smallBtn}
      onClick={() => {
        setEditingActivityId(activity.id);
        setEditTitle(activity.title || "");
        setEditStart(activity.start_time || "");
        setEditEnd(activity.end_time || "");
      }}
    >
      Modifier
    </button>

    <button
      style={{ ...smallBtn, background: "red", color: "white" }}
      onClick={() => deleteActivity(activity.id)}
    >
      Supprimer
    </button>
  </div>
</div>

      {isEditing && (
        <div style={formBox}>
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
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

          <button onClick={() => updateActivity(activity.id)} style={btn}>
            Enregistrer
          </button>

          <button
            onClick={() => setEditingActivityId(null)}
            style={smallBtn}
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}

const card = {
  border: "1px solid #ddd",
  padding: 15,
  marginTop: 10,
  borderRadius: 10,
  background: "white",
};

const btn = {
  padding: "10px 15px",
  background: "black",
  color: "white",
  border: "none",
  borderRadius: 8,
  marginTop: 10,
};

const dragOverlayCard = {
  padding: 10,
  background: "#111",
  color: "white",
  borderRadius: 8,
  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
  cursor: "grabbing",
  opacity: 0.95,
};

const input = {
  display: "block",
  padding: 8,
  marginTop: 8,
  width: 220,
};

const formBox = {
  marginTop: 10,
  padding: 10,
  background: "#fafafa",
  borderRadius: 8,
};

const smallBtn = {
  padding: "6px 10px",
  border: "1px solid #ddd",
  borderRadius: 6,
  cursor: "pointer",
};