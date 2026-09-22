"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useSearchParams } from "next/navigation";
import { Pencil } from "lucide-react";

export default function BookingsPage() {
  const { id } = useParams();

  const [bookings, setBookings] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [type, setType] = useState("other");
  const [status, setStatus] = useState("non_reserve");
  const [paid, setPaid] = useState(false);
  const [price, setPrice] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
const searchParams = useSearchParams();
const selectedBookingFromUrl = searchParams.get("booking");
const [openBookingMenuId, setOpenBookingMenuId] =
  useState<string | null>(null);

const [editingBookingId, setEditingBookingId] =
  useState<string | null>(null);

const [editTitle, setEditTitle] = useState("");
const [editType, setEditType] = useState("");
const [editPrice, setEditPrice] = useState("");

const [highlightedBookingId, setHighlightedBookingId] =
  useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, [id]);

  async function loadBookings() {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadBookings error:", error.message);
      return;
    }

    setBookings(data || []);
  }

  async function addBooking() {
    if (!title.trim()) return;

    const { error } = await supabase.from("bookings").insert([
      {
        event_id: id,
        title,
        type,
        status,
        paid,
        price: price ? Number(price) : 0,
        contact: contact || null,
        notes: notes || null,
      },
    ]);

    if (error) {
      console.error("addBooking error:", error.message);
      return;
    }

    setTitle("");
    setType("other");
    setStatus("non_reserve");
    setPaid(false);
    setPrice("");
    setContact("");
    setNotes("");
    setShowForm(false);

    await loadBookings();
  }

  async function deleteBooking(bookingId: string) {
    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", bookingId);

    if (error) {
      console.error("deleteBooking error:", error.message);
      return;
    }

    await loadBookings();
  }

  async function updateStatus(booking: any, newStatus: string) {
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", booking.id);

    if (error) {
      console.error("updateStatus error:", error.message);
      return;
    }

    await loadBookings();
  }

function startEditBooking(booking: any) {
  setEditingBookingId(booking.id);
  setEditTitle(booking.name || "");
  setEditType(booking.type || "");
  setEditPrice(
    booking.price !== null && booking.price !== undefined
      ? String(booking.price)
      : ""
  );

  setOpenBookingMenuId(null);
}

async function updateBooking(bookingId: string) {
  if (!editTitle.trim()) return;

  const updates = {
    name: editTitle.trim(),
    type: editType || null,
    price: editPrice ? Number(editPrice) : null,
  };

  const { data, error } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", bookingId)
    .select()
    .single();

  if (error) {
    console.error("updateBooking error:", error.message);
    return;
  }

  setBookings((prev: any[]) =>
    prev.map((booking) =>
      booking.id === bookingId ? data : booking
    )
  );

  setEditingBookingId(null);
}

async function deleteBooking(bookingId: string) {
  const confirmed = window.confirm(
    "Voulez-vous supprimer définitivement cette réservation ?"
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (error) {
    console.error("deleteBooking error:", error.message);
    return;
  }

  setBookings((prev: any[]) =>
    prev.filter((booking) => booking.id !== bookingId)
  );

  setOpenBookingMenuId(null);
}

  async function togglePaid(booking: any) {
    const { error } = await supabase
      .from("bookings")
      .update({ paid: !booking.paid })
      .eq("id", booking.id);

    if (error) {
      console.error("togglePaid error:", error.message);
      return;
    }

    await loadBookings();
  }

useEffect(() => {
  if (!selectedBookingFromUrl || bookings.length === 0) return;

  const timeout = window.setTimeout(() => {
    const element = document.getElementById(
      `booking-${selectedBookingFromUrl}`
    );

    if (!element) return;

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    setHighlightedBookingId(selectedBookingFromUrl);

    window.setTimeout(() => {
      setHighlightedBookingId(null);
    }, 2500);
  }, 200);

  return () => window.clearTimeout(timeout);
}, [selectedBookingFromUrl, bookings]);

  function getTypeLabel(type: string) {
    switch (type) {
      case "hotel":
        return "🏨 Hôtel";
      case "transport":
        return "✈️ Transport";
      case "restaurant":
        return "🍽️ Restaurant";
      case "photographer":
        return "📸 Photographe";
      case "venue":
        return "🏛️ Salle";
      case "activity":
        return "🎟️ Activité";
      case "music":
        return "🎵 DJ / Musique";
      default:
        return "📋 Autre";
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "reserve":
        return "Réservé";
      case "annule":
        return "Annulé";
      default:
        return "Non réservé";
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "reserve":
        return "#22c55e";
      case "annule":
        return "#ef4444";
      default:
        return "#f59e0b";
    }
  }

async function toggleBookingPaid(booking: any) {
  const newValue = !booking.is_paid;

  setBookings((prev: any[]) =>
    prev.map((item) =>
      item.id === booking.id
        ? { ...item, is_paid: newValue }
        : item
    )
  );

  const { error } = await supabase
    .from("bookings")
    .update({ is_paid: newValue })
    .eq("id", booking.id);

  if (error) {
    console.error("toggleBookingPaid error:", error.message);

    setBookings((prev: any[]) =>
      prev.map((item) =>
        item.id === booking.id
          ? { ...item, is_paid: booking.is_paid }
          : item
      )
    );
  }
}

async function toggleBookingReserved(booking: any) {
  const newValue = !booking.is_reserved;

  setBookings((prev: any[]) =>
    prev.map((item) =>
      item.id === booking.id
        ? { ...item, is_reserved: newValue }
        : item
    )
  );

  const { error } = await supabase
    .from("bookings")
    .update({ is_reserved: newValue })
    .eq("id", booking.id);

  if (error) {
    console.error("toggleBookingReserved error:", error.message);

    setBookings((prev: any[]) =>
      prev.map((item) =>
        item.id === booking.id
          ? { ...item, is_reserved: booking.is_reserved }
          : item
      )
    );
  }
}

  return (
    <div>

      <button onClick={() => setShowForm(!showForm)} style={btn}>
        Ajouter une reservation
      </button>

      {showForm && (
        <div style={formCard}>
          <h2>Nouveau booking</h2>

          <input
            placeholder="Nom ex: Photographe, Hôtel, Restaurant..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={input}
          />

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={input}
          >
            <option value="hotel">🏨 Hôtel</option>
            <option value="transport">✈️ Transport</option>
            <option value="restaurant">🍽️ Restaurant</option>
            <option value="photographer">📸 Photographe</option>
            <option value="venue">🏛️ Salle</option>
            <option value="activity">🎟️ Activité</option>
            <option value="music">🎵 DJ / Musique</option>
            <option value="other">📋 Autre</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={input}
          >
            <option value="non_reserve">Non réservé</option>
            <option value="reserve">Réservé</option>
            <option value="annule">Annulé</option>
          </select>

          <input
            type="number"
            placeholder="Prix"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={input}
          />

          <input
            placeholder="Contact / email / téléphone"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            style={input}
          />

          <textarea
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={textarea}
          />

          <label style={{ display: "block", marginTop: 10 }}>
            <input
              type="checkbox"
              checked={paid}
              onChange={(e) => setPaid(e.target.checked)}
            />{" "}
            Payé
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addBooking} style={btn}>
              Créer
            </button>

            <button onClick={() => setShowForm(false)} style={smallBtn}>
              Annuler
            </button>
          </div>
        </div>
      )}

<div style={{ marginTop: 25 }}>
  {bookings.length === 0 ? (
    <p>Aucun booking pour le moment.</p>
  ) : (
    bookings.map((booking) => (
      <div
        key={booking.id}
        id={`booking-${booking.id}`}
        style={{
          ...bookingCard,
          ...(highlightedBookingId === booking.id
            ? highlightedBookingCard
            : {}),
        }}
      >
        <div style={bookingHeader}>
  <div style={bookingContent}>
    <h3 style={bookingTitle}>
      {booking.name || "Réservation"}
    </h3>

    <div style={bookingInfoRow}>
      <div style={bookingLeftInfo}>
        <span style={bookingLabel}>Type</span>
        <span style={bookingValue}>
          {booking.booking_type || "-"}
        </span>
      </div>

      <button
        type="button"
        onClick={() => toggleBookingReserved(booking)}
        style={{
          ...statusBadge,
          ...(booking.is_reserved
            ? reservedBadge
            : notReservedBadge),
        }}
      >
        {booking.is_reserved ? "Réservé" : "Non réservé"}
      </button>
    </div>

    <div style={bookingInfoRow}>
      <div style={bookingLeftInfo}>
        <span style={bookingLabel}>Prix</span>
        <span style={bookingValue}>
          {booking.price !== null &&
          booking.price !== undefined &&
          booking.price !== ""
            ? `${booking.price} €`
            : "-"}
        </span>
      </div>

      <button
        type="button"
        onClick={() => toggleBookingPaid(booking)}
        style={{
          ...statusBadge,
          ...(booking.is_paid ? paidBadge : unpaidBadge),
        }}
      >
        {booking.is_paid ? "Payé" : "Non payé"}
      </button>
    </div>

    {booking.notes?.trim() && (
      <div style={bookingNotes}>
        <span style={bookingLabel}>Notes</span>

        <p style={bookingNotesText}>
          {booking.notes}
        </p>
      </div>
    )}
  </div>

  <div style={{ position: "relative" }}>
    <button
      type="button"
      style={iconBtn}
      onClick={(event) => {
        event.stopPropagation();

        setOpenBookingMenuId(
          openBookingMenuId === booking.id ? null : booking.id
        );
      }}
    >
      <Pencil size={15} />
    </button>

    {openBookingMenuId === booking.id && (
      <div style={miniMenu}>
        <button
          type="button"
          style={menuItem}
          onClick={() => startEditBooking(booking)}
        >
          Modifier
        </button>

        <button
          type="button"
          style={{ ...menuItem, color: "#dc2626" }}
          onClick={() => deleteBooking(booking.id)}
        >
          Supprimer
        </button>
      </div>
    )}
  </div>
</div>

        {editingBookingId === booking.id && (
          <div style={editForm}>
            <input
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              placeholder="Titre"
              style={input}
            />

            <input
              value={editType}
              onChange={(event) => setEditType(event.target.value)}
              placeholder="Type"
              style={input}
            />

            <input
              type="number"
              value={editPrice}
              onChange={(event) => setEditPrice(event.target.value)}
              placeholder="Montant"
              style={input}
            />

            <div style={editActions}>
              <button
                type="button"
                style={primaryBtn}
                onClick={() => updateBooking(booking.id)}
              >
                Enregistrer
              </button>

              <button
                type="button"
                style={secondaryBtn}
                onClick={() => setEditingBookingId(null)}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    ))
  )}
</div>

    </div>
  );
}

const btn = {
  padding: "10px 15px",
  background: "black",
  color: "white",
  border: "none",
  borderRadius: 8,
  marginTop: 10,
  cursor: "pointer",
};

const smallBtn = {
  padding: "7px 12px",
  border: "1px solid #ddd",
  borderRadius: 8,
  background: "white",
  cursor: "pointer",
};

const input = {
  display: "block",
  padding: 10,
  marginTop: 10,
  border: "1px solid #ddd",
  borderRadius: 8,
};

const textarea = {
  display: "block",
  padding: 10,
  marginTop: 10,
  width: 300,
  minHeight: 80,
  border: "1px solid #ddd",
  borderRadius: 8,
};

const formCard = {
  marginTop: 15,
  padding: 20,
  border: "1px solid #ddd",
  borderRadius: 12,
  background: "white",
  maxWidth: 420,
};

const card = {
  marginTop: 15,
  padding: 18,
  border: "1px solid #ddd",
  borderRadius: 12,
  background: "white",
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
};

const actions = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 8,
  minWidth: 180,
};

const badge = {
  display: "inline-block",
  padding: "5px 10px",
  borderRadius: 999,
  background: "#f1f1f1",
  fontSize: 12,
  marginBottom: 10,
};

const highlightedBookingCard = {
  border: "2px solid #6E8570",
  background: "#E6EEE5",
  boxShadow: "0 0 0 5px rgba(110,133,112,0.14)",
  transition: "all 0.3s ease",
};

const bookingHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
};

const bookingTitle = {
  margin: 0,
  marginBottom: 16,
  fontSize: 20,
  fontWeight: 700,
  color: "#222222",
};

const bookingBadges = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 8,
  marginTop: 10,
};

const bookingContent: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const statusBadge = {
  width: 110,
  height: 28,
  padding: "0 10px",
  borderRadius: 999,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const paidBadge = {
  background: "#DDEBDD",
  color: "#557058",
  border: "1px solid #A8BFA5",
};

const unpaidBadge = {
  background: "#F3E1DD",
  color: "#A05245",
  border: "1px solid #D7B4A5",
};

const reservedBadge = {
  background: "#E2EAF0",
  color: "#527887",
  border: "1px solid #8FAFB9",
};

const bookingNotesText: React.CSSProperties = {
  margin: "5px 0 0",
  color: "#555555",
  fontSize: 14,
  lineHeight: 1.5,
};

const bookingInfoRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  minHeight: 42,
  borderTop: "1px solid #E8E3DA",
};

const bookingLeftInfo: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "70px 1fr",
  alignItems: "center",
  gap: 12,
  flex: 1,
};

const bookingLabel: React.CSSProperties = {
  color: "#8A8A7A",
  fontSize: 13,
  fontWeight: 600,
};

const bookingRight = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
};

const bookingValue: React.CSSProperties = {
  color: "#222222",
  fontSize: 14,
  fontWeight: 600,
};

const bookingNotes: React.CSSProperties = {
  paddingTop: 12,
  borderTop: "1px solid #E8E3DA",
};

const notReservedBadge = {
  background: "#EEEAE3",
  color: "#776E61",
  border: "1px solid #B7A98D",
};

const iconBtn = {
  width: 32,
  height: 32,
  padding: 0,
  borderRadius: 9,
  border: "1px solid #DED8CE",
  background: "#FAFAF8",
  color: "#222222",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const miniMenu = {
  position: "absolute" as const,
  top: 38,
  right: 0,
  width: 140,
  border: "1px solid #DED8CE",
  borderRadius: 10,
  background: "#FAFAF8",
  boxShadow: "0 10px 25px rgba(34,34,34,0.12)",
  overflow: "hidden",
  zIndex: 100,
};

const menuItem = {
  width: "100%",
  padding: "10px 12px",
  border: "none",
  background: "#FAFAF8",
  color: "#222222",
  cursor: "pointer",
  textAlign: "left" as const,
};

const editForm = {
  marginTop: 16,
  padding: 16,
  borderRadius: 14,
  border: "1px solid #DED8CE",
  background: "#F4F1EC",
};

const editActions = {
  display: "flex",
  gap: 10,
  marginTop: 12,
};

const primaryBtn = {
  padding: "9px 14px",
  border: "none",
  borderRadius: 10,
  background: "#6E8570",
  color: "#FAFAF8",
  cursor: "pointer",
  fontWeight: 600,
};

const secondaryBtn = {
  padding: "9px 14px",
  border: "1px solid #DED8CE",
  borderRadius: 10,
  background: "#FAFAF8",
  color: "#222222",
  cursor: "pointer",
  fontWeight: 600,
};

const bookingMeta = {
  margin: "8px 0 0",
  color: "#8A8A7A",
  fontSize: 14,
};

const bookingCard = {
  marginTop: 12,
  padding: 18,
  borderRadius: 16,
  border: "1px solid #DED8CE",
  background: "#FAFAF8",
  color: "#222222",
  boxShadow: "0 10px 25px rgba(34,34,34,0.05)",
};