"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useSearchParams } from "next/navigation";

export default function BookingsPage() {
  const { id } = useParams();

  const [bookings, setBookings] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState("other");
  const [status, setStatus] = useState("non_reserve");
  const [paid, setPaid] = useState(false);
  const [price, setPrice] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
const searchParams = useSearchParams();
const selectedBookingFromUrl = searchParams.get("booking");

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
    if (!name.trim()) return;

    const { error } = await supabase.from("bookings").insert([
      {
        event_id: id,
        name,
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

    setName("");
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
            value={name}
            onChange={(e) => setName(e.target.value)}
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
              <div>
                <h3 style={{ marginTop: 0 }}>{booking.name}</h3>

                <span style={badge}>{getTypeLabel(booking.type)}</span>

                <p>Prix : {booking.price || 0} €</p>
                <p>Contact : {booking.contact || "-"}</p>
                <p>Notes : {booking.notes || "-"}</p>
              </div>

              <div style={actions}>
                <span
                  style={{
                    ...statusBadge,
                    background: getStatusColor(booking.status),
                  }}
                >
                  {getStatusLabel(booking.status)}
                </span>

                <select
                  value={booking.status}
                  onChange={(e) => updateStatus(booking, e.target.value)}
                  style={input}
                >
                  <option value="non_reserve">Non réservé</option>
                  <option value="reserve">Réservé</option>
                  <option value="annule">Annulé</option>
                </select>

                <button onClick={() => togglePaid(booking)} style={smallBtn}>
                  {booking.paid ? "Payé ✅" : "Non payé"}
                </button>

                <button
                  onClick={() => deleteBooking(booking.id)}
                  style={{ ...smallBtn, background: "red", color: "white" }}
                >
                  Supprimer
                </button>
              </div>
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

const statusBadge = {
  display: "inline-block",
  padding: "5px 10px",
  borderRadius: 999,
  color: "white",
  fontSize: 12,
  fontWeight: "bold",
  textAlign: "center" as const,
};

const highlightedBookingCard = {
  border: "2px solid #6E8570",
  background: "#E6EEE5",
  boxShadow: "0 0 0 5px rgba(110,133,112,0.14)",
  transition: "all 0.3s ease",
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