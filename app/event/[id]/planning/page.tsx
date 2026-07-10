"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Grip, Pencil } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fr } from "date-fns/locale";
import TimePicker from "react-time-picker";
import "react-time-picker/dist/TimePicker.css";
import "react-clock/dist/Clock.css";

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

type EventDay = {
  id: string;
  event_id: string;
  day_number: number;
  date: string | null;
};

type Activity = {
  id: string;
  day_id: string;
  title: string;
  description: string | null;
  type: string | null;
  start_time: string | null;
  end_time: string | null;
  position: number;
  booking_id: string | null;
  booking?: any;

};

type CalendarCreateSlot = {
  dayId: string;
  date: string;
  start: string;
  end: string;
};

function cleanTime(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 5);
}

function normalizeTime(value?: string | null) {
  if (!value) return null;
  return `${value.slice(0, 5)}:00`;
}

export default function Planning() {
  const params = useParams();
  const eventId = String(params.id);
  const [editType, setEditType] = useState("activite");

  const [days, setDays] = useState<EventDay[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingSearchActivityId, setBookingSearchActivityId] = useState<string | null>(null);
  const [bookingSearch, setBookingSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const [activeDragType, setActiveDragType] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [activityTitle, setActivityTitle] = useState("");
  const [activityStart, setActivityStart] = useState("");
  const [activityEnd, setActivityEnd] = useState("");
  const [activityType, setActivityType] = useState("activite");
  const [selectedBookingId, setSelectedBookingId] = useState("");

  const [calendarCreateSlot, setCalendarCreateSlot] =
    useState<CalendarCreateSlot | null>(null);

  const [weekStartDate, setWeekStartDate] = useState<Date | null>(null);
  const [nowTick, setNowTick] = useState(new Date());
  const [calendarDragPreview, setCalendarDragPreview] = useState<any | null>(null);
  const [hoveredActivity, setHoveredActivity] = useState<any | null>(null);

  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [description, setDescription] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [openActivityMenuId, setOpenActivityMenuId] = useState<string | null>(null);

  const startHour = 0;
  const endHour = 24;
  const hourHeight = 72;

  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => i + startHour
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const activitiesByDay = useMemo(() => {
    return activities.reduce<Record<string, Activity[]>>((acc, activity) => {
      if (!acc[activity.day_id]) acc[activity.day_id] = [];
      acc[activity.day_id].push(activity);
      acc[activity.day_id].sort((a, b) => a.position - b.position);
      return acc;
    }, {});
  }, [activities]);

  useEffect(() => {
    loadData();
  }, [eventId]);

  useEffect(() => {
    if (viewMode !== "calendar") return;

    const timeout = setTimeout(() => {
      const calendar = document.getElementById("calendar-scroll-area");
      if (!calendar) return;

      const now = new Date();
      const targetHour =
        now.getHours() >= 8 && now.getHours() <= 22 ? now.getHours() : 8;

      calendar.scrollTop = targetHour * hourHeight;
    }, 50);

    return () => clearTimeout(timeout);
  }, [viewMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    const { data: daysData, error: daysError } = await supabase
      .from("event_days")
      .select("*")
      .eq("event_id", eventId)
      .order("day_number", { ascending: true });

    if (daysError) {
      console.error(daysError.message);
      setLoading(false);
      return;
    }

    const { data: activitiesData, error: activitiesError } = await supabase
      .from("activities")
.select(`
  *,
  booking:bookings(*)
`)
      .order("position", { ascending: true });

    if (activitiesError) {
      console.error(activitiesError.message);
      setLoading(false);
      return;
    }

    setDays(daysData || []);
    setActivities(activitiesData || []);

const { data: bookingsData, error: bookingsError } = await supabase
  .from("bookings")
  .select("*")
  .eq("event_id", eventId)
  .order("created_at", { ascending: false });

if (bookingsError) {
  console.error(bookingsError.message);
} else {
  setBookings(bookingsData || []);
}

    const firstDatedDay = (daysData || []).find((day) => day.date);

    if (firstDatedDay && !weekStartDate) {
      setWeekStartDate(new Date(firstDatedDay.date));
    }

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

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === "day") {
      const overDayId =
        overType === "day" ? overId : over.data.current?.dayId;

      if (!overDayId) {
        resetDrag();
        return;
      }

      const oldIndex = days.findIndex((day) => day.id === activeId);
      const newIndex = days.findIndex((day) => day.id === overDayId);

      if (oldIndex === -1 || newIndex === -1) {
        resetDrag();
        return;
      }

      const newDays = arrayMove(days, oldIndex, newIndex).map((day, index) => ({
        ...day,
        day_number: index + 1,
      }));

      setDays(newDays);

      const results = await Promise.all(
        newDays.map((day) =>
          supabase
            .from("event_days")
            .update({ day_number: day.day_number })
            .eq("id", day.id)
        )
      );

      if (results.some((result) => result.error)) {
        console.error("drag days update error:", results);
        await loadData();
      }

      resetDrag();
      return;
    }

    if (activeType === "activity") {
      const moved = activities.find((activity) => activity.id === activeId);
      if (!moved) {
        resetDrag();
        return;
      }

      const overActivity = activities.find((activity) => activity.id === overId);
      const targetDayId =
        overActivity?.day_id || over.data.current?.dayId || moved.day_id;

      const sourceDayId = moved.day_id;

      const sourceActivities = activities
        .filter((activity) => activity.day_id === sourceDayId && activity.id !== activeId)
        .sort((a, b) => a.position - b.position);

      const targetActivities =
        sourceDayId === targetDayId
          ? sourceActivities
          : activities
              .filter((activity) => activity.day_id === targetDayId)
              .sort((a, b) => a.position - b.position);

      let insertIndex = targetActivities.length;

      if (overActivity) {
        insertIndex = targetActivities.findIndex(
          (activity) => activity.id === overId
        );
      }

      const newTargetActivities = [
        ...targetActivities.slice(0, insertIndex),
        { ...moved, day_id: targetDayId },
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
        return (
          newTargetActivities.find((item) => item.id === activity.id) ||
          newSourceActivities.find((item) => item.id === activity.id) ||
          activity
        );
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

      if (results.some((result) => result.error)) {
        console.error("drag activities update error:", results);
        await loadData();
      }

      resetDrag();
    }
  }

  async function addDay() {
    const previousDay = days[days.length - 1];

    let newDate = null;

    if (previousDay?.date) {
      const date = new Date(previousDay.date);
      date.setDate(date.getDate() + 1);
      newDate = formatDateKey(date);
    }

    const { data, error } = await supabase
      .from("event_days")
      .insert([
        {
          event_id: eventId,
          day_number: days.length + 1,
          date: newDate,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("addDay error:", error.message);
      return;
    }

    setDays((prev) => [...prev, data]);
  }

  async function deleteDay(dayId: string) {
    const dayActivities = activitiesByDay[dayId] || [];

    if (
      dayActivities.length > 0 &&
      !window.confirm("Ce jour contient des activités. Le supprimer quand même ?")
    ) {
      return;
    }

    await supabase.from("activities").delete().eq("day_id", dayId);
    await supabase.from("event_days").delete().eq("id", dayId);

    setActivities((prev) => prev.filter((activity) => activity.day_id !== dayId));
    setDays((prev) => prev.filter((day) => day.id !== dayId));
  }

  async function updateDayDate(dayId: string, date: string) {
    const value = date || null;

    setDays((prev) =>
      prev.map((day) => (day.id === dayId ? { ...day, date: value } : day))
    );

    const { error } = await supabase
      .from("event_days")
      .update({ date: value })
      .eq("id", dayId);

    if (error) {
      console.error(error.message);
      await loadData();
    }
  }

  async function addActivity(dayId: string) {
    if (!activityTitle.trim()) return;

    const dayActivities = activitiesByDay[dayId] || [];

    const { data, error } = await supabase
      .from("activities")
.insert([
  {
    day_id: dayId,
    title: activityTitle.trim(),
    description: description.trim() || null,
    type: activityType,
    start_time: activityStart || null,
    end_time: activityEnd || null,
    position: dayActivities.length,
    booking_id: selectedBookingId || null,
  },
])
      .select()
      .single();

    if (error) {
      console.error("addActivity error:", error.message);
      return;
    }

const selectedBooking = bookings.find(
  (booking) => booking.id === selectedBookingId
);

setActivities((prev) => [
  ...prev,
  {
    ...data,
    booking: selectedBooking || null,
  },
]);
    setActivityTitle("");
    setDescription("");
    setActivityStart("");
    setActivityEnd("");
    setActivityType("activite");
    setSelectedDay(null);
    setSelectedBookingId("");
  }

  async function deleteActivity(activityId: string) {
    const { error } = await supabase
      .from("activities")
      .delete()
      .eq("id", activityId);

    if (error) {
      console.error("deleteActivity Supabase error:", error.message);
      return;
    }

    setActivities((prev) =>
      prev.filter((activity) => activity.id !== activityId)
    );
  }

async function attachBookingToActivity(activityId: string, bookingId: string) {
  const booking = bookings.find((item) => item.id === bookingId);

  setActivities((prev) =>
    prev.map((activity) =>
      activity.id === activityId
        ? { ...activity, booking_id: bookingId, booking }
        : activity
    )
  );

  const { error } = await supabase
    .from("activities")
    .update({ booking_id: bookingId })
    .eq("id", activityId);

  if (error) {
    console.error(error.message);
    await loadData();
  }

  setBookingSearchActivityId(null);
}

async function updateActivity(activityId: string) {
  if (!editTitle.trim()) return;

  const updates = {
    title: editTitle.trim(),
    description: editDescription.trim() || null,
    type: editType,
    start_time: normalizeTime(editStart),
    end_time: normalizeTime(editEnd),
  };

  const { data, error } = await supabase
    .from("activities")
    .update(updates)
    .eq("id", activityId)
    .select(`
      *,
      booking:bookings(*)
    `)
    .single();

  if (error) {
    console.error("updateActivity error:", error.message);
    await loadData();
    return;
  }

  setActivities((prev) =>
    prev.map((activity) =>
      activity.id === activityId ? data : activity
    )
  );

  setEditingActivityId(null);
  setEditTitle("");
  setEditDescription("");
  setEditStart("");
  setEditEnd("");
  setEditType("activite");
}

async function detachBookingFromActivity(activityId: string) {
  setActivities((prev) =>
    prev.map((activity) =>
      activity.id === activityId
        ? {
            ...activity,
            booking_id: null,
            booking: null,
          }
        : activity
    )
  );

  const { error } = await supabase
    .from("activities")
    .update({ booking_id: null })
    .eq("id", activityId);

  if (error) {
    console.error("detachBookingFromActivity error:", error.message);
    await loadData();
    return;
  }

  setBookingSearchActivityId(null);
}  

async function updateActivityFromCalendar(
    activityId: string,
    updates: Partial<Activity>
  ) {
    setActivities((prev) =>
      prev.map((activity) =>
        activity.id === activityId ? { ...activity, ...updates } : activity
      )
    );

    const { error } = await supabase
      .from("activities")
      .update(updates)
      .eq("id", activityId);

    if (error) {
      console.error(error.message);
      await loadData();
    }
  }

  async function ensureDayForDate(dateKey: string) {
    const existingDay = days.find((day) => day.date === dateKey);
    if (existingDay) return existingDay;

    const { data, error } = await supabase
      .from("event_days")
      .insert([
        {
          event_id: eventId,
          day_number: days.length + 1,
          date: dateKey,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(error.message);
      return null;
    }

    setDays((prev) => [...prev, data]);
    return data as EventDay;
  }

  async function openCreateActivityFromCalendar(dateKey: string, clientY: number) {
    const day = await ensureDayForDate(dateKey);
    if (!day) return;

    const column = document.querySelector(
      `[data-date="${dateKey}"]`
    ) as HTMLElement | null;

    if (!column) return;

    const rect = column.getBoundingClientRect();
    const y = clientY - rect.top;

    const startMinutes =
      startHour * 60 + Math.round((y / hourHeight) * 4) * 15;

    setCalendarCreateSlot({
      dayId: day.id,
      date: dateKey,
      start: minutesToTime(startMinutes),
      end: minutesToTime(startMinutes + 60),
    });

    setActivityTitle("");
    setActivityType("activite");
  }

  async function createActivityFromCalendar() {
    if (!calendarCreateSlot || !activityTitle.trim()) return;

    const dayActivities = activitiesByDay[calendarCreateSlot.dayId] || [];

    const { data, error } = await supabase
      .from("activities")
      .insert([
        {
          day_id: calendarCreateSlot.dayId,
          title: activityTitle.trim(),
	  description,
          type: activityType,
          start_time: calendarCreateSlot.start,
          end_time: calendarCreateSlot.end,
          position: dayActivities.length,
          booking_id: selectedBookingId || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(error.message);
      return;
    }

    const booking = bookings.find(
  (b) => b.id === selectedBookingId
);

const selectedBooking = bookings.find(
  (booking) => booking.id === selectedBookingId
);

setActivities((prev) => [
  ...prev,
  {
    ...data,
    booking: selectedBooking || null,
  },
]);
    setCalendarCreateSlot(null);
    setActivityTitle("");
    setActivityType("activite");
setDescription("");
setSelectedBookingId("");
  }

  async function moveCalendarActivity(
    activity: Activity,
    clientX: number,
    clientY: number
  ) {
    const column = document
      .elementFromPoint(clientX, clientY)
      ?.closest("[data-date]") as HTMLElement | null;

    if (!column) return;

    const targetDate = column.getAttribute("data-date");
    if (!targetDate) return;

    const targetDay = await ensureDayForDate(targetDate);
    if (!targetDay) return;

    const rect = column.getBoundingClientRect();
    const y = clientY - rect.top;

    const startMinutes =
      startHour * 60 + Math.round((y / hourHeight) * 4) * 15;

    const duration =
      timeToMinutes(activity.end_time) - timeToMinutes(activity.start_time);

    await updateActivityFromCalendar(activity.id, {
      day_id: targetDay.id,
      start_time: minutesToTime(startMinutes),
      end_time: minutesToTime(startMinutes + Math.max(duration, 30)),
    });
  }

  function getMonday(date: Date) {
    const next = new Date(date);
    const day = next.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    next.setDate(next.getDate() + diff);
    next.setHours(0, 0, 0, 0);

    return next;
  }

  function getWeekDays() {
    const start = getMonday(weekStartDate || new Date());

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }

  function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

  function changeWeek(direction: "prev" | "next") {
    const currentMonday = getMonday(weekStartDate || new Date());
    const next = new Date(currentMonday);
    next.setDate(currentMonday.getDate() + (direction === "next" ? 7 : -7));
    setWeekStartDate(next);
  }

  function goToTodayWeek() {
    const today = new Date();
    setWeekStartDate(getMonday(today));

    requestAnimationFrame(() => {
      const calendar = document.getElementById("calendar-scroll-area");
      if (!calendar) return;

      const minutes = today.getHours() * 60 + today.getMinutes();
      calendar.scrollTop =
        ((minutes - startHour * 60) / 60) * hourHeight - 250;
    });
  }

  function isToday(date: Date) {
    return formatDateKey(date) === formatDateKey(new Date());
  }

  function getCurrentTimeTop() {
    const minutes = nowTick.getHours() * 60 + nowTick.getMinutes();
    const calendarStart = startHour * 60;
    const calendarEnd = endHour * 60;

    if (minutes < calendarStart || minutes > calendarEnd) return null;

    return ((minutes - calendarStart) / 60) * hourHeight;
  }

  function getWeekTitle() {
    if (!weekStartDate) return "Semaine";

    const start = getMonday(weekStartDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return `Semaine du ${start.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    })} au ${end.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`;
  }

  function minutesToTime(totalMinutes: number) {
    const clamped = Math.max(0, Math.min(totalMinutes, 23 * 60 + 59));
    const hours = Math.floor(clamped / 60);
    const minutes = clamped % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  }

  function timeToMinutes(time?: string | null) {
    if (!time) return startHour * 60;

    const [hoursPart, minutesPart] = time.split(":");
    return Number(hoursPart) * 60 + Number(minutesPart || 0);
  }

  function getActivityStyle(activity: Activity) {
    const startMinutes = timeToMinutes(activity.start_time);
    const endMinutes = activity.end_time
      ? timeToMinutes(activity.end_time)
      : startMinutes + 60;

    const top = ((startMinutes - startHour * 60) / 60) * hourHeight;
    const height = Math.max(
      36,
      ((endMinutes - startMinutes) / 60) * hourHeight
    );

    return {
      top: Math.max(0, top),
      height,
    };
  }

  function formatTime(time?: string | null) {
    if (!time) return "--";
    return time.slice(0, 5);
  }

  function activitiesOverlap(a: Activity, b: Activity) {
    return (
      timeToMinutes(a.start_time) < timeToMinutes(b.end_time) &&
      timeToMinutes(b.start_time) < timeToMinutes(a.end_time)
    );
  }

  function hasOverlap(activity: Activity, dayActivities: Activity[]) {
    return dayActivities.some(
      (other) => other.id !== activity.id && activitiesOverlap(activity, other)
    );
  }

  function getOverlapStyle(activity: Activity, dayActivities: Activity[]) {
    const overlapping = dayActivities
      .filter((item) => activitiesOverlap(activity, item))
      .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));

    const index = overlapping.findIndex((item) => item.id === activity.id);
    const count = Math.max(overlapping.length, 1);

    return {
      left: `calc(8px + ${(index * 100) / count}%)`,
      width: `calc(${100 / count}% - 12px)`,
    };
  }

  async function exportPlanningPDF() {
    const html2pdf = (await import("html2pdf.js")).default;
    const element = document.getElementById("planning-export");

    if (!element) return;

    html2pdf()
      .set({
        margin: 10,
        filename:
          viewMode === "list"
            ? "planning-liste.pdf"
            : "planning-calendrier.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: viewMode === "calendar" ? "landscape" : "portrait",
        },
      })
      .from(element)
      .save();
  }

  if (loading) return <p>Chargement...</p>;

  return (
    <div style={{ padding: 20, background: "#F4F1EC" }}>
      <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
        <button
          onClick={() => setViewMode("list")}
          style={viewMode === "list" ? activeViewBtn : smallBtn}
        >
          Vue liste
        </button>

        <button
          onClick={() => setViewMode("calendar")}
          style={viewMode === "calendar" ? activeViewBtn : smallBtn}
        >
          Vue calendrier
        </button>

        <button onClick={exportPlanningPDF} style={smallBtn}>
          Exporter en PDF
        </button>
      </div>

      <div id="planning-export">
        {viewMode === "list" && (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={days.map((day) => day.id)}
                strategy={verticalListSortingStrategy}
              >
                {days.map((day, index) => {
                  const dayActivities = activitiesByDay[day.id] || [];

                  return (
                    <SortableDay key={day.id} id={day.id}>
                      <DayContainer
                        dayId={day.id}
                        disabled={activeDragType === "day"}
                      >
                        <div style={{ ...card, position: "relative" }}>
                          <div style={dayHeader}>
                            <span style={dayTitle}>Jour {index + 1}</span>

                            <div style={dayActions}>
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedDay(
                                    selectedDay === day.id ? null : day.id
                                  );
                                }}
                                style={dayIconBtn}
                              >
                                +
                              </button>

                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  deleteDay(day.id);
                                }}
                                style={dayDeleteBtn}
                              >
                                ×
                              </button>
                            </div>
                          </div>

                          <input
                            type="date"
                            value={day.date || ""}
                            onChange={(event) =>
                              updateDayDate(day.id, event.target.value)
                            }
                            style={input}
                          />

                          <SortableContext
                            items={dayActivities.map((activity) => activity.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {dayActivities.map((activity) => (
                              <SortableItem
  key={activity.id}
  activity={activity}
  editingActivityId={editingActivityId}
  setEditingActivityId={setEditingActivityId}
  editTitle={editTitle}
  setEditTitle={setEditTitle}
  editDescription={editDescription}
  setEditDescription={setEditDescription}
  editStart={editStart}
  setEditStart={setEditStart}
  editEnd={editEnd}
  setEditEnd={setEditEnd}
  editType={editType}
  setEditType={setEditType}
  bookings={bookings}
  bookingSearchActivityId={bookingSearchActivityId}
  setBookingSearchActivityId={setBookingSearchActivityId}
  bookingSearch={bookingSearch}
  attachBookingToActivity={attachBookingToActivity}
  detachBookingFromActivity={detachBookingFromActivity}
  updateActivity={updateActivity}
  deleteActivity={deleteActivity}
  openActivityMenuId={openActivityMenuId}
  setOpenActivityMenuId={setOpenActivityMenuId}
  formatTime={formatTime}
  bookingSearch={bookingSearch}
  setBookingSearch={setBookingSearch}
/>
                            ))}
                          </SortableContext>

                          {selectedDay === day.id && (
                            <div style={formBox}>
                              <input
                                placeholder="Titre de l'activité"
                                value={activityTitle}
                                onChange={(event) =>
                                  setActivityTitle(event.target.value)
                                }
                                style={input}
                              />
<textarea
  placeholder="Description (optionnelle)"
  value={description}
  onChange={(event) => setDescription(event.target.value)}
  style={textarea}
/>

<TimePicker
  value={activityStart}
  onChange={(value: string | null) => {
    if (!value) return;

    setActivityStart(cleanTime(value));

    if (activityEnd && value > activityEnd) {
      setActivityEnd("");
    }
  }}
  format="HH:mm"
  disableClock
  clearIcon={null}
/>

<TimePicker
  value={activityEnd}
  onChange={(value) => {
    if (!value) return;
    setActivityEnd(cleanTime(value));
  }}
  format="HH:mm"
  disableClock
  clearIcon={null}
/>
<select
  value={activityType}
  onChange={(event) => setActivityType(event.target.value)}
  style={input}
>
  <option value="activite">Activité</option>
  <option value="rdv">RDV</option>
  <option value="evenement">Événement</option>
  <option value="transport">Transport</option>
  <option value="repas">Repas</option>
  <option value="hebergement">Hebergement</option>
</select>

<select
  value={selectedBookingId}
  onChange={(event) => setSelectedBookingId(event.target.value)}
  style={input}
>
  <option value="">Ajouter une réservation</option>

  {bookings.map((booking) => (
    <option key={booking.id} value={booking.id}>
      {booking.title || booking.name || booking.label || "Réservation"}
    </option>
  ))}
</select>

                              <div style={formActions}>
  <button onClick={() => addActivity(day.id)} style={btn}>
    Créer
  </button>

  <button
    onClick={() => {
      setSelectedDay(null);
      setActivityTitle("");
      setActivityStart("");
      setActivityEnd("");
      setActivityType("activite");
      setBookingSearch("");
    }}
    style={smallBtn}
  >
    Annuler
  </button>
</div>
</div>
)}
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

            <button onClick={addDay} style={addDayBottomBtn}>
              + Ajouter un jour
            </button>
          </>
        )}

        {viewMode === "calendar" && (
          <div id="calendar-scroll-area" style={calendarWrapper}>
            <div style={calendarTopBar}>
              <button style={calendarArrow} onClick={() => changeWeek("prev")}>
                ←
              </button>

              <div style={calendarCenter}>
                <button style={todayBtn} onClick={goToTodayWeek}>
                  Aujourd’hui
                </button>

                <div style={calendarWeekTitle}>{getWeekTitle()}</div>
              </div>

              <button style={calendarArrow} onClick={() => changeWeek("next")}>
                →
              </button>
            </div>

            <div
              style={{
                ...calendarHeader,
                gridTemplateColumns: "80px repeat(7, 1fr)",
              }}
            >
              <div style={timeColumnHeader}></div>

              {getWeekDays().map((date) => (
                <div
                  key={formatDateKey(date)}
                  style={{
                    ...calendarHeaderDay,
                    ...(isToday(date) ? todayHeaderDay : {}),
                  }}
                >
                  <strong>
                    {date.toLocaleDateString("fr-FR", { weekday: "short" })}
                  </strong>

                  <div>
                    {date.toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                ...calendarBody,
                gridTemplateColumns: "80px repeat(7, 1fr)",
              }}
            >
              <div>
                {hours.map((hour) => (
                  <div key={hour} style={timeCell}>
                    {String(hour).padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {getWeekDays().map((date) => {
                const dateKey = formatDateKey(date);
                const matchingDay = days.find((day) => day.date === dateKey);

                const dayActivities = matchingDay
                  ? [...(activitiesByDay[matchingDay.id] || [])]
                      .filter((activity) => activity.start_time)
                      .sort((a, b) =>
                        String(a.start_time).localeCompare(
                          String(b.start_time)
                        )
                      )
                  : [];

                return (
                  <div
                    key={dateKey}
                    data-date={dateKey}
                    onDoubleClick={(event) => {
                      openCreateActivityFromCalendar(dateKey, event.clientY);
                    }}
                    style={{
                      ...calendarDayColumn,
                      height: hours.length * hourHeight,
                      ...(isToday(date) ? todayColumn : {}),
                    }}
                  >
                    {hours.map((hour) => (
                      <div
                        key={`${dateKey}-${hour}`}
                        style={{
                          ...calendarHourLine,
                          height: hourHeight,
                        }}
                      />
                    ))}

                    {dayActivities.map((activity) => {
                      const style = getActivityStyle(activity);
                      const overlapping = hasOverlap(activity, dayActivities);

                      return (
                        <div
                          key={activity.id}
                          onMouseEnter={(event) => {
                            if (!overlapping) return;

                            setHoveredActivity({
                              ...activity,
                              x: event.clientX,
                              y: event.clientY,
                            });
                          }}
                          onMouseMove={(event) => {
                            if (!overlapping) return;

                            setHoveredActivity((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    x: event.clientX,
                                    y: event.clientY,
                                  }
                                : null
                            );
                          }}
                          onMouseLeave={() => {
                            if (hoveredActivity?.id === activity.id) {
                              setHoveredActivity(null);
                            }
                          }}
                          onMouseDown={(event) => {
                            const target = event.target as HTMLElement;

                            if (
                              target.tagName === "INPUT" ||
                              target.closest("[data-resize-handle]")
                            ) {
                              return;
                            }

                            event.preventDefault();

                            setCalendarDragPreview({
                              title: activity.title,
                              type: activity.type,
                              start_time: activity.start_time,
                              end_time: activity.end_time,
                              x: event.clientX,
                              y: event.clientY,
                            });

                            function onMouseMove(moveEvent: MouseEvent) {
                              setCalendarDragPreview((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      x: moveEvent.clientX,
                                      y: moveEvent.clientY,
                                    }
                                  : null
                              );
                            }

                            function onMouseUp(upEvent: MouseEvent) {
                              moveCalendarActivity(
                                activity,
                                upEvent.clientX,
                                upEvent.clientY
                              );

                              window.removeEventListener(
                                "mousemove",
                                onMouseMove
                              );
                              window.removeEventListener("mouseup", onMouseUp);
                              setCalendarDragPreview(null);
                            }

                            window.addEventListener("mousemove", onMouseMove);
                            window.addEventListener("mouseup", onMouseUp);
                          }}
                          style={{
                            ...calendarActivityBlock,
                            ...getOverlapStyle(activity, dayActivities),
                            top: style.top,
                            height: style.height,
                            background: getActivityColor(activity.type),
                            cursor: "grab",
                          }}
                        >
<div>
  <CalendarActivityTitleInput
    activity={activity}
    updateActivity={updateActivityFromCalendar}
  />

  {activity.description && (
    <div style={calendarActivityDescription}>
      {activity.description}
    </div>
  )}

  {activity.booking && (
    <div style={bookingLinkedBox}>
      Réservation :{" "}
      {activity.booking.title ||
        activity.booking.name ||
        activity.booking.label ||
        "Réservation"}
    </div>
  )}
</div>

                          <div style={calendarActivityTime}>
                            {formatTime(activity.start_time)} →{" "}
                            {formatTime(activity.end_time)}
                          </div>

                          <div
                            data-resize-handle
                            style={calendarResizeHandle}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();

                              const startY = event.clientY;
                              const startEnd = timeToMinutes(activity.end_time);
                              const startStart = timeToMinutes(
                                activity.start_time
                              );

                              function onMouseMove(moveEvent: MouseEvent) {
                                const deltaY = moveEvent.clientY - startY;
                                const deltaMinutes =
                                  Math.round(
                                    ((deltaY / hourHeight) * 60) / 15
                                  ) * 15;

                                const newEndMinutes = Math.max(
                                  startStart + 15,
                                  startEnd + deltaMinutes
                                );

                                updateActivityFromCalendar(activity.id, {
                                  end_time: minutesToTime(newEndMinutes),
                                });
                              }

                              function onMouseUp() {
                                window.removeEventListener(
                                  "mousemove",
                                  onMouseMove
                                );
                                window.removeEventListener(
                                  "mouseup",
                                  onMouseUp
                                );
                              }

                              window.addEventListener(
                                "mousemove",
                                onMouseMove
                              );
                              window.addEventListener("mouseup", onMouseUp);
                            }}
                          />
                        </div>
                      );
                    })}

                    {isToday(date) && getCurrentTimeTop() !== null && (
                      <div
                        style={{
                          ...currentTimeLine,
                          top: getCurrentTimeTop()!,
                        }}
                      >
                        <div style={currentTimeDot} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {calendarCreateSlot && (
        <div style={calendarCreateOverlay}>
          <div style={calendarCreateModal}>
            <h3>Nouvelle activité</h3>

            <p style={{ marginTop: 0, color: "#6b7280" }}>
              {calendarCreateSlot.date} · {calendarCreateSlot.start} →{" "}
              {calendarCreateSlot.end}
            </p>

            <input
              placeholder="Titre de l'activité"
              value={activityTitle}
              onChange={(event) => setActivityTitle(event.target.value)}
              style={input}
            />
<textarea
  placeholder="Description (optionnelle)"
  value={description}
  onChange={(event) => setDescription(event.target.value)}
  style={textarea}
/>

            <select
              value={activityType}
              onChange={(event) => setActivityType(event.target.value)}
              style={input}
            >

              <option value="activite">Activité</option>
              <option value="rdv">RDV</option>
              <option value="evenement">Événement</option>
	      <option value="transport">Transport</option>
	      <option value="repas">Repas</option>
	      <option value="hebergement">Hebergement</option>
            </select>
<select
  value={selectedBookingId}
  onChange={(event) => setSelectedBookingId(event.target.value)}
  style={input}
>
  <option value="">Ajouter une réservation</option>

  {bookings.map((booking) => (
    <option key={booking.id} value={booking.id}>
      {booking.title || booking.name || booking.label || "Réservation"}
    </option>
  ))}
</select>

            <button style={btn} onClick={createActivityFromCalendar}>
              Créer
            </button>

            <button
              style={smallBtn}
              onClick={() => {
                setCalendarCreateSlot(null);
                setActivityTitle("");
		setSelectedBookingId("");
		setBookingSearch("");
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {hoveredActivity && !calendarDragPreview && (
        <div
          style={{
            ...activityTooltip,
            left: hoveredActivity.x + 14,
            top: hoveredActivity.y + 14,
            borderTop: `4px solid ${getActivityColor(hoveredActivity.type)}`,
          }}
        >
          <strong>{hoveredActivity.title}</strong>

          <div style={tooltipMeta}>
            {formatTime(hoveredActivity.start_time)} →{" "}
            {formatTime(hoveredActivity.end_time)}
          </div>

          <div style={tooltipType}>
            {hoveredActivity.type || "Activité"}
          </div>
        </div>
      )}

      {calendarDragPreview && (
        <div
          style={{
            ...calendarDragPreviewStyle,
            left: calendarDragPreview.x + 12,
            top: calendarDragPreview.y + 12,
            background: getActivityColor(calendarDragPreview.type),
          }}
        >
          <strong>{calendarDragPreview.title}</strong>

          <div style={calendarActivityTime}>
            {formatTime(calendarDragPreview.start_time)} →{" "}
            {formatTime(calendarDragPreview.end_time)}
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarActivityTitleInput({
  activity,
  updateActivity,
}: {
  activity: Activity;
  updateActivity: (activityId: string, updates: Partial<Activity>) => void;
}) {
  const [value, setValue] = useState(activity.title);

  useEffect(() => {
    setValue(activity.title);
  }, [activity.title]);

  useEffect(() => {
    if (value === activity.title) return;

    const timeout = setTimeout(() => {
      updateActivity(activity.id, { title: value });
    }, 500);

    return () => clearTimeout(timeout);
  }, [value]);

  return (
    <input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      style={calendarActivityTitleInput}
    />
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
  marginTop: 10,
  borderRadius: 18,
  background: isOver ? "#E6EEE5" : "transparent",
}}
    >
      {children}
    </div>
  );
}

function getActivityColor(type?: string | null) {
  switch (type?.toLowerCase()) {
    case "activite":
      return "#A8BFA5";

    case "rdv":
      return "#7F9A82";

    case "evenement":
      return "#C9A66B";

    case "transport":
      return "#8FAFB9";

    case "repas":
      return "#D7B4A5";

    case "hebergement":
      return "#B7A98D";

    default:
      return "#B8B0A5";
  }
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
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition || "transform 200ms ease",
        marginTop: 12,
        cursor: "grab",
      }}
    >
      {children}
    </div>
  );
}

function TimeInput({ value, onClick, placeholder }: any) {
  return (
    <button type="button" onClick={onClick} style={timePickerInput}>
      {value || placeholder}
    </button>
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
  openActivityMenuId,
  setOpenActivityMenuId,
  formatTime,
  editType,
  setEditType,
  editDescription,
  setEditDescription,
  bookings,
  bookingSearchActivityId,
  setBookingSearchActivityId,
  attachBookingToActivity,
  detachBookingFromActivity,
  bookingSearch,
  setBookingSearch,
}: any) {
  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({
      id: activity.id,
      data: {
        type: "activity",
        dayId: activity.day_id,
      },
    });

  const isEditing = editingActivityId === activity.id;
  const showBookingPicker = bookingSearchActivityId === activity.id;

const normalizedBookingSearch = bookingSearch
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");

const filteredBookings = bookings.filter((booking: any) => {
  if (!normalizedBookingSearch) return true;

  const searchableText = [
    booking.title,
    booking.name,
    booking.label,
    booking.reference,
    booking.location,
    booking.address,
    booking.provider,
    booking.type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return searchableText.includes(normalizedBookingSearch);
});

  function getBookingName(booking: any) {
    return (
      booking?.title ||
      booking?.name ||
      booking?.label ||
      booking?.reference ||
      "Réservation"
    );
  }

  function openBooking() {
    if (!activity.booking) return;

    const bookingEventId = activity.booking.event_id || activity.event_id;

    if (!bookingEventId) {
      console.error("event_id introuvable pour cette réservation");
      return;
    }

    window.location.href =
      `/event/${bookingEventId}/bookings?booking=${activity.booking.id}`;
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition || "transform 200ms ease",
      }}
    >
      <div style={activityCard}>
        <div style={activityTopRow}>
<div {...listeners} style={activityDragArea}>

  <div
    style={{
      ...activityBadge,
      background: getActivityColor(activity.type),
    }}
  >
    {activity.type || "Activité"}
  </div>

  <div style={{ minWidth: 0 }}>
    <strong style={activityTitleText}>
      {activity.title}
    </strong>

    {activity.description && (
      <p style={activityDescription}>
        {activity.description}
      </p>
    )}
  </div>

  <div style={activityHoursColumn}>
    <div>
      <span style={timeLabel}>Début</span>
      <div style={timeValue}>
        {formatTime(activity.start_time)}
      </div>
    </div>

    <div>
      <span style={timeLabel}>Fin</span>
      <div style={timeValue}>
        {formatTime(activity.end_time)}
      </div>
    </div>
  </div>

  <div style={bookingActionColumn}>
    {activity.booking && (
      <button
        type="button"
        style={viewBookingBtn}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openBooking();
        }}
      >
        Voir la réservation
      </button>
    )}
  </div>

</div>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              style={iconBtn}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();

                setOpenActivityMenuId(
                  openActivityMenuId === activity.id ? null : activity.id
                );
              }}
            >
              <Pencil size={15} />
            </button>

            {openActivityMenuId === activity.id && (
              <div
                style={miniMenu}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  style={menuItem}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    setEditingActivityId(activity.id);
                    setEditType(activity.type || "activite");
                    setEditTitle(activity.title || "");
                    setEditStart(cleanTime(activity.start_time));
                    setEditEnd(cleanTime(activity.end_time));
                    setEditDescription(activity.description || "");
                    setOpenActivityMenuId(null);
                    setBookingSearchActivityId(null);
                  }}
                >
                  Modifier
                </button>

                <button
                  type="button"
                  style={{ ...menuItem, color: "#dc2626" }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    deleteActivity(activity.id);
                    setOpenActivityMenuId(null);
                  }}
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditing && (
        <div
          style={formBox}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <input
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            placeholder="Titre de l’activité"
            style={input}
          />

          <textarea
            placeholder="Description (optionnelle)"
            value={editDescription}
            onChange={(event) => setEditDescription(event.target.value)}
            style={textarea}
          />

          <TimePicker
            value={editStart}
            onChange={(value: string | null) => {
              if (!value) {
                setEditStart("");
                return;
              }

              const cleanValue = cleanTime(value);
              setEditStart(cleanValue);

              if (editEnd && cleanValue > editEnd) {
                setEditEnd("");
              }
            }}
            format="HH:mm"
            disableClock
            clearIcon={null}
          />

          <TimePicker
            value={editEnd}
            onChange={(value: string | null) => {
              if (!value) {
                setEditEnd("");
                return;
              }

              setEditEnd(cleanTime(value));
            }}
            format="HH:mm"
            disableClock
            clearIcon={null}
          />

          <select
            value={editType}
            onChange={(event) => setEditType(event.target.value)}
            style={input}
          >
            <option value="activite">Activité</option>
            <option value="rdv">RDV</option>
            <option value="evenement">Événement</option>
            <option value="repas">Repas</option>
            <option value="transport">Transport</option>
            <option value="hebergement">Hébergement</option>
          </select>

          <button
            type="button"
            style={smallBtn}
onClick={(event) => {
  event.preventDefault();
  event.stopPropagation();

  const willOpen = bookingSearchActivityId !== activity.id;

  setBookingSearchActivityId(willOpen ? activity.id : null);
  setBookingSearch("");
}}
          >
            {activity.booking
              ? "Changer la réservation"
              : "Ajouter une réservation"}
          </button>

{showBookingPicker && (
  <div style={bookingPicker}>
    <input
      type="search"
      value={bookingSearch}
      onChange={(event) => setBookingSearch(event.target.value)}
      placeholder="Rechercher une réservation..."
      autoFocus
      style={bookingSearchInput}
    />

    <div style={bookingSearchResults}>
{bookingSearch.trim().length >= 2 && (
  filteredBookings.length === 0 ? (
    <p style={emptyBookingText}>
      Aucune réservation trouvée.
    </p>
  ) : (
    filteredBookings.map((booking: any) => (
      <button
        key={booking.id}
        type="button"
        style={{
          ...bookingPickerItem,
          ...(activity.booking_id === booking.id
            ? selectedBookingItem
            : {}),
        }}
        onClick={() => {
          attachBookingToActivity(activity.id, booking.id);
          setBookingSearch("");
        }}
      >
        <span style={bookingResultMain}>
          {getBookingName(booking)}
        </span>

        <span style={bookingResultMeta}>
          {[
            booking.type,
            booking.reference,
            booking.location,
            booking.provider,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </button>
    ))
  )
)}
    </div>
  </div>
)}

{activity.booking && (
  <div style={currentBookingRow}>
    <div>
      <span style={currentBookingLabel}>Réservation liée</span>

      <strong style={currentBookingName}>
        {getBookingName(activity.booking)}
      </strong>
    </div>

    <div style={currentBookingActions}>
      <button
        type="button"
        style={viewBookingBtn}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          openBooking();
        }}
      >
        Voir
      </button>

      <button
        type="button"
        style={removeBookingBtn}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();

          detachBookingFromActivity(activity.id);
        }}
      >
        Retirer
      </button>
    </div>
  </div>
)}

          <div style={formActions}>
            <button
              type="button"
              onClick={() => updateActivity(activity.id)}
              style={btn}
            >
              Enregistrer
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingActivityId(null);
                setBookingSearchActivityId(null);
                setEditTitle("");
                setEditDescription("");
                setEditStart("");
                setEditEnd("");
                setEditType("activite");
              }}
              style={smallBtn}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function timeStringToDate(time?: string | null) {
  const date = new Date();

  if (!time) {
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const [h, m] = time.split(":").map(Number);

  date.setHours(h, m, 0, 0);

  return date;
}

function dateToTimeString(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}  

const card = {
  border: "1px solid #DED8CE",
  padding: 18,
  marginTop: 10,
  borderRadius: 18,
  background: "#FAFAF8",
  boxShadow: "0 12px 30px rgba(34,34,34,.05)",
};

const btn = {
  padding: "10px 15px",
  background: "#6E8570",
  color: "#FAFAF8",
  border: "none",
  borderRadius: 10,
  marginTop: 10,
  cursor: "pointer",
  fontWeight: 600,
};

const smallBtn = {
  padding: "8px 12px",
  border: "1px solid #DED8CE",
  borderRadius: 10,
  cursor: "pointer",
  background: "#FAFAF8",
  color: "#222222",
  marginTop: 10,
};

const input = {
  display: "block",
  padding: 10,
  marginTop: 8,
  width: 220,
  background: "#FAFAF8",
  border: "1px solid #DED8CE",
  borderRadius: 10,
  color: "#222222",
};

const formBox = {
  marginTop: 12,
  padding: 16,
  background: "#F4F1EC",
  borderRadius: 14,
  border: "1px solid #DED8CE",
};

const activeViewBtn = {
  ...smallBtn,
  background: "#6E8570",
  color: "#FAFAF8",
  border: "1px solid #6E8570",
};

const dragOverlayCard = {
  padding: 10,
  background: "#111",
  color: "white",
  borderRadius: 8,
  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
};

const calendarWrapper = {
  marginTop: 20,
  border: "1px solid #DED8CE",
  borderRadius: 18,
  background: "#FAFAF8",
  overflowX: "auto",
  overflowY: "auto",
  maxHeight: 820,
};

const calendarTopBar = {
  display: "grid",
  gridTemplateColumns: "60px 1fr 60px",
  alignItems: "center",
  padding: "12px 18px",
  background: "#FAFAF8",
  borderBottom: "1px solid #DED8CE",
  position: "sticky" as const,
  top: 0,
  zIndex: 30,
};

const calendarCenter = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 14,
};

const calendarWeekTitle = {
  textAlign: "center" as const,
  fontWeight: 700,
  fontSize: 20,
};

const calendarArrow = {
  width: 36,
  height: 36,
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
  fontSize: 18,
};

const todayBtn = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
  fontWeight: 600,
};

const calendarHeader = {
  display: "grid",
  position: "sticky" as const,
  top: 60,
  zIndex: 100,
  background: "#FAFAF8",
  borderBottom: "1px solid #DED8CE",
};

const timeColumnHeader = {
  padding: 12,
  borderRight: "1px solid #eee",
  background: "white",
};

const calendarHeaderDay = {
  padding: 12,
  textAlign: "center" as const,
  background: "#F4F1EC",
  borderRight: "1px solid #DED8CE",
};

const calendarBody = {
  display: "grid",
};

const textarea = {
  display: "block",
  padding: 10,
  marginTop: 8,
  width: 220,
  minHeight: 70,
  background: "#FAFAF8",
  border: "1px solid #DED8CE",
  borderRadius: 10,
  color: "#222222",
  resize: "vertical" as const,
};

const calendarActivityDescription = {
  fontSize: 11,
  opacity: 0.85,
  marginTop: 3,
  lineHeight: 1.25,
  color: "rgba(255,255,255,.9)",
};

const timeCell = {
  height: 72,
  padding: 8,
  borderRight: "1px solid #DED8CE",
  borderBottom: "1px solid #E8E3DA",
  color: "#8A8A7A",
  fontSize: 13,
  boxSizing: "border-box" as const,
};

const calendarDayColumn = {
  position: "relative" as const,
  borderRight: "1px solid #eee",
};

const calendarHourLine = {
  borderBottom: "1px solid #E8E3DA",
  boxSizing: "border-box" as const,
};

const calendarActivityBlock = {
  position: "absolute" as const,
  padding: 10,
  borderRadius: 12,
  color: "white",
  fontSize: 13,
  overflow: "hidden",
  boxSizing: "border-box" as const,
  boxShadow: "0 4px 10px rgba(0,0,0,.15)",
};

const calendarActivityTitleInput = {
  width: "100%",
  border: "none",
  background: "transparent",
  color: "white",
  fontWeight: 700,
  outline: "none",
};

const calendarActivityTime = {
  fontSize: 12,
  marginTop: 4,
  color: "rgba(255,255,255,.9)",
};

const calendarResizeHandle = {
  position: "absolute" as const,
  left: 0,
  right: 0,
  bottom: 0,
  height: 8,
  cursor: "ns-resize",
  background: "rgba(255,255,255,0.35)",
};

const todayHeaderDay = {
  background: "#DDE7DB",
  color: "#6E8570",
};

const todayColumn = {
  background: "#F8FBF7",
};

const currentTimeLine = {
  position: "absolute" as const,
  left: 0,
  right: 0,
  height: 2,
  background: "#6E8570",
  zIndex: 10,
  pointerEvents: "none" as const,
};

const currentTimeDot = {
  position: "absolute" as const,
  width: 10,
  height: 10,
  borderRadius: "50%",
  background: "#6E8570",
  left: -5,
  top: -4,
};

const addDayBottomBtn = {
  ...btn,
  width: "100%",
  marginTop: 20,
  background: "#f3f4f6",
  color: "#111",
  border: "1px dashed #ccc",
};

const iconBtn = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const miniMenu = {
  position: "absolute" as const,
  right: 0,
  top: 34,
  width: 140,
  background: "#FAFAF8",
  border: "1px solid #DED8CE",
  borderRadius: 10,
  boxShadow: "0 8px 24px rgba(0,0,0,.12)",
  overflow: "hidden",
  zIndex: 100,
};

const menuItem = {
  display: "block",
  width: "100%",
  padding: "10px 12px",
  border: "none",
  background: "#FAFAF8",
  textAlign: "left" as const,
  cursor: "pointer",
};

const activityCard = {
  padding: 12,
  marginTop: 8,
  background: "#FAFAF8",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
};

const activityTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const activityDragArea = {
  display: "grid",
  gridTemplateColumns: "110px 1fr 140px 170px",
  gap: 28,
  alignItems: "center",
  flex: 1,
  cursor: "grab",
};

const activityHours = {
  display: "flex",
  gap: 20,
  minWidth: 130,
};

const activityTitle = {
  fontWeight: 700,
  color: "#111827",
  whiteSpace: "nowrap" as const,
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const activityBadge = {
  width: 100,
  height: 30,

  display: "flex",
  justifyContent: "center",
  alignItems: "center",

  borderRadius: 999,
  color: "white",
  fontSize: 12,
  fontWeight: 700,

  textTransform: "capitalize" as const,
  boxSizing: "border-box" as const,

  flexShrink: 0,
};

const timeLabel = {
  display: "block",
  fontSize: 11,
  color: "#9ca3af",
  fontWeight: 600,
  marginBottom: 2,
};

const timeValue = {
  fontSize: 15,
  fontWeight: 700,
  color: "#111827",
};

const dayHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 14,
};

const dayTitle = {
  fontSize: 22,
  fontWeight: 700,
};

const dayActions = {
  display: "flex",
  gap: 8,
};

const activityDescription = {
  marginTop: 4,
  fontSize: 13,
  color: "#8A8A7A",
  lineHeight: 1.4,
};

const dayIconBtn = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#f3f4f6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: 18,
};

const dayDeleteBtn = {
  ...dayIconBtn,
  color: "#dc2626",
};

const calendarCreateOverlay = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,0.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 99998,
};

const calendarCreateModal = {
  width: 360,
  padding: 20,
  borderRadius: 16,
  background: "#FAFAF8",
  border: "1px solid #DED8CE",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};

const calendarDragPreviewStyle = {
  position: "fixed" as const,
  width: 190,
  padding: 10,
  borderRadius: 12,
  color: "white",
  fontSize: 13,
  boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
  pointerEvents: "none" as const,
  zIndex: 99999,
  opacity: 0.9,
};

const activityTooltip = {
  position: "fixed" as const,
  width: 240,
  padding: 12,
  borderRadius: 12,
  background: "#FAFAF8",
  border: "1px solid #DED8CE",
  color: "#111827",
  boxShadow: "0 14px 35px rgba(0,0,0,0.18)",
  zIndex: 99998,
  pointerEvents: "none" as const,
  fontSize: 14,
};

const tooltipMeta = {
  marginTop: 6,
  color: "#6b7280",
  fontSize: 13,
};

const tooltipType = {
  display: "inline-block",
  marginTop: 8,
  padding: "3px 8px",
  borderRadius: 999,
  background: "#f3f4f6",
  fontSize: 12,
  fontWeight: 700,
};

const formActions = {
  display: "flex",
  gap: 10,
  alignItems: "center",
};

const bookingLinkedBox = {
  marginTop: 8,
  padding: "7px 10px",
  borderRadius: 10,
  background: "#E6EEE5",
  color: "#6E8570",
  fontSize: 13,
  fontWeight: 600,
};

const bookingPicker = {
  marginTop: 8,
  padding: 10,
  border: "1px solid #DED8CE",
  borderRadius: 12,
  background: "#FAFAF8",
  display: "flex",
  flexDirection: "column" as const,
  gap: 6,
};

const bookingPickerItem = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #DED8CE",
  borderRadius: 10,
  background: "#F4F1EC",
  color: "#222222",
  cursor: "pointer",
  textAlign: "left" as const,
};

const emptyBookingText = {
  margin: 0,
  color: "#8A8A7A",
  fontSize: 13,
};

const timePickerInput = {
  display: "block",
  padding: 10,
  marginTop: 8,
  width: 220,
  background: "#FAFAF8",
  border: "1px solid #DED8CE",
  borderRadius: 10,
  color: "#222222",
  textAlign: "left" as const,
  cursor: "pointer",
};

const activityTitleRow = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap" as const,
  gap: 8,
};

const activityTitleText = {
  color: "#222222",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const viewBookingBtn = {
  padding: "7px 10px",
  border: "1px solid #A8BFA5",
  borderRadius: 9,
  background: "#E6EEE5",
  color: "#6E8570",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap" as const,
};

const selectedBookingItem = {
  border: "1px solid #6E8570",
  background: "#E6EEE5",
  color: "#6E8570",
};

const currentBookingRow = {
  width: 220,
  marginTop: 10,
  padding: "9px 10px",
  border: "1px solid #C9D8C7",
  borderRadius: 10,
  background: "#E6EEE5",
  color: "#222222",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  fontSize: 12,
};

const activityScheduleColumn = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "flex-start",
  gap: 9,
};

const noBookingText = {
  fontSize: 12,
  color: "#8A8A7A",
  textAlign: "center" as const,
};

const activityHoursColumn = {
  display: "flex",
  flexDirection: "row" as const,
  gap: 18,
  alignItems: "center",
  justifyContent: "center",
  minWidth: 140,
};

const bookingActionColumn = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
};

const currentBookingLabel = {
  display: "block",
  fontSize: 11,
  color: "#8A8A7A",
  marginBottom: 2,
};

const currentBookingName = {
  display: "block",
  fontSize: 13,
  color: "#222222",
};

const currentBookingActions = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const removeBookingBtn = {
  padding: 0,
  border: "none",
  background: "transparent",
  color: "#dc2626",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
};

const bookingSearchInput = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #DED8CE",
  borderRadius: 10,
  background: "#FAFAF8",
  color: "#222222",
  fontSize: 14,
  boxSizing: "border-box" as const,
  outline: "none",
};

const bookingSearchResults = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 6,
  maxHeight: 260,
  overflowY: "auto" as const,
  marginTop: 8,
};

const bookingResultMain = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  color: "#222222",
};

const bookingResultMeta = {
  display: "block",
  marginTop: 3,
  fontSize: 11,
  fontWeight: 400,
  color: "#8A8A7A",
};