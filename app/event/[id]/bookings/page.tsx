"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useSearchParams } from "next/navigation";
import {
  Pencil,
  Ticket,
  CalendarClock,
  CalendarDays,
  Plane,
  Utensils,
  BedDouble,
  Shapes,
} from "lucide-react";

export default function BookingsPage() {
  const { id } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

const [title, setTitle] = useState("");
const [type, setType] = useState("activite");
const [price, setPrice] = useState("");
const [bookingDate, setBookingDate] = useState("");
const [bookingTime, setBookingTime] = useState("");
const [notes, setNotes] = useState("");
const [isPaid, setIsPaid] = useState(false);
const [isReserved, setIsReserved] = useState(false);
const searchParams = useSearchParams();
const selectedBookingFromUrl = searchParams.get("booking");
const [openBookingMenuId, setOpenBookingMenuId] =
  useState<string | null>(null);

const [editingBookingId, setEditingBookingId] =
  useState<string | null>(null);

const [highlightedBookingId, setHighlightedBookingId] =
  useState<string | null>(null);

const [documentFiles, setDocumentFiles] = useState<File[]>([]);
const [bookingDocuments, setBookingDocuments] = useState<any[]>([]);
const [uploadingDocuments, setUploadingDocuments] = useState(false);

  useEffect(() => {
  loadEvent();
  loadBookings();
  loadBookingDocuments();
}, [id]);

async function loadEvent() {
  const { data, error } = await supabase
    .from("events")
    .select("title")
    .eq("id", id)
    .single();

  if (error) {
    console.error("loadEvent error:", error.message);
    return;
  }

  setEvent(data);
}

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

async function loadBookingDocuments() {
  const { data, error } = await supabase
    .from("booking_documents")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(
      "loadBookingDocuments error:",
      error.message
    );
    return;
  }

  const documentsWithSignedUrls = await Promise.all(
    (data || []).map(async (document) => {
      const { data: signedData, error: signedError } =
        await supabase.storage
          .from("booking-documents")
          .createSignedUrl(
            document.storage_path,
            60 * 60
          );

      if (signedError) {
        console.error(
          "Erreur URL document:",
          signedError.message
        );

        return {
          ...document,
          signed_url: null,
        };
      }

      return {
        ...document,
        signed_url: signedData.signedUrl,
      };
    })
  );

  setBookingDocuments(documentsWithSignedUrls);
}

async function uploadBookingDocuments(
  bookingId: string,
  files: File[]
) {
  if (files.length === 0) return true;

  setUploadingDocuments(true);

  try {
    for (const file of files) {
      const safeName = file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      const storagePath =
        `${id}/${bookingId}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("booking-documents")
        .upload(storagePath, file);

      if (uploadError) {
        console.error(
          "Erreur upload document:",
          uploadError.message
        );
        return false;
      }

      const { data: publicUrlData } = supabase.storage
        .from("booking-documents")

      const { error: documentError } = await supabase
  .from("booking_documents")
  .insert([
    {
      booking_id: bookingId,
      file_name: file.name,
      file_url: "",
      storage_path: storagePath,
    },
  ]);

      if (documentError) {
        console.error(
          "Erreur création booking_document:",
          documentError.message
        );

        await supabase.storage
          .from("booking-documents")
          .remove([storagePath]);

        return false;
      }
    }

    return true;
  } finally {
    setUploadingDocuments(false);
  }
}

async function deleteBookingDocument(document: any) {
  // 1. Supprimer le fichier du Storage
  const { error: storageError } = await supabase.storage
    .from("booking-documents")
    .remove([document.storage_path]);

  if (storageError) {
    console.error(
      "Erreur suppression fichier Storage :",
      storageError.message
    );
    return;
  }

  // 2. Supprimer la ligne dans booking_documents
  const { error: databaseError } = await supabase
    .from("booking_documents")
    .delete()
    .eq("id", document.id);

  if (databaseError) {
    console.error(
      "Erreur suppression booking_document :",
      databaseError.message
    );
    return;
  }

  // 3. Retirer immédiatement le document de l'affichage
  setBookingDocuments((prev) =>
    prev.filter((item) => item.id !== document.id)
  );
}

function resetBookingForm() {
  setTitle("");
  setType("activite");
  setPrice("");
  setNotes("");
  setIsPaid(false);
  setIsReserved(false);
  setEditingBookingId(null);
  setBookingDate("");
  setBookingTime("");
  setDocumentFiles([]);
}

function closeBookingForm() {
  resetBookingForm();
  setShowForm(false);
}

async function addBooking() {
  if (!title.trim()) return;

  const { data, error } = await supabase
    .from("bookings")
    .insert([
      {
        event_id: id,
        name: title.trim(),
        type,
        price: price ? Number(price) : 0,
        notes: notes.trim() || null,
        is_paid: isPaid,
        is_reserved: isReserved,
        booking_date: bookingDate || null,
        booking_time: bookingTime || null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("addBooking error:", error.message);
    return;
  }

  if (documentFiles.length > 0) {
    const success = await uploadBookingDocuments(
      data.id,
      documentFiles
    );

    if (!success) {
      console.error(
        "La réservation a été créée mais certains documents n'ont pas pu être ajoutés."
      );
    }
  }

  closeBookingForm();

  await Promise.all([
    loadBookings(),
    loadBookingDocuments(),
  ]);
}

async function deleteBooking(bookingId: string) {
  // 1. Chercher toutes les activités liées à cette réservation
  const { data: linkedActivities, error: activitiesSearchError } =
    await supabase
      .from("activities")
      .select("id")
      .eq("booking_id", bookingId);

  if (activitiesSearchError) {
    console.error(
      "Erreur recherche activités liées :",
      activitiesSearchError.message
    );
    return;
  }

  const activityIds = (linkedActivities || []).map(
    (activity) => activity.id
  );

  // 2. Supprimer les dépenses liées à ces activités
  if (activityIds.length > 0) {
    const { error: budgetError } = await supabase
      .from("budget_items")
      .delete()
      .in("activity_id", activityIds);

    if (budgetError) {
      console.error(
        "Erreur suppression dépenses liées :",
        budgetError.message
      );
      return;
    }

    // 3. Supprimer les activités du Planning
    const { error: activitiesDeleteError } = await supabase
      .from("activities")
      .delete()
      .eq("booking_id", bookingId);

    if (activitiesDeleteError) {
      console.error(
        "Erreur suppression activités liées :",
        activitiesDeleteError.message
      );
      return;
    }
  }

  // 4. Supprimer la réservation
  const { error: bookingError } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (bookingError) {
    console.error(
      "deleteBooking error:",
      bookingError.message
    );
    return;
  }

  setOpenBookingMenuId(null);
  await loadBookings();
}

function startEditBooking(booking: any) {
  setEditingBookingId(booking.id);

  setTitle(booking.name || "");
  setType(booking.type || "activite");

setBookingDate(booking.booking_date || "");

setBookingTime(
  booking.booking_time
    ? booking.booking_time.slice(0, 5)
    : ""
);

  setPrice(
    booking.price !== null && booking.price !== undefined
      ? String(booking.price)
      : ""
  );

  setNotes(booking.notes || "");
  setIsPaid(Boolean(booking.is_paid));
  setIsReserved(Boolean(booking.is_reserved));

  setOpenBookingMenuId(null);
  setShowForm(true);
}

async function updateBooking(bookingId: string) {
  if (!title.trim()) return;

  const newPrice = price ? Number(price) : 0;

  const updates = {
    name: title.trim(),
    type,
    price: newPrice,
    notes: notes.trim() || null,
    is_paid: isPaid,
    is_reserved: isReserved,
    booking_date: bookingDate || null,
    booking_time: bookingTime || null,
  };

  // 1. Mettre à jour la réservation
  const { error: bookingError } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", bookingId);

  if (bookingError) {
    console.error(
      "updateBooking error:",
      bookingError.message
    );
    return;
  }

  // 2. Trouver toutes les activités liées à cette réservation
  const { data: linkedActivities, error: activitiesError } =
    await supabase
      .from("activities")
      .select("id, title, type")
      .eq("booking_id", bookingId);

  if (activitiesError) {
    console.error(
      "Erreur recherche activités liées :",
      activitiesError.message
    );
    return;
  }

  // 3. Synchroniser le Budget de chaque activité liée
  for (const activity of linkedActivities || []) {
    const { data: existingBudgetItem, error: budgetSearchError } =
      await supabase
        .from("budget_items")
        .select("id")
        .eq("activity_id", activity.id)
        .maybeSingle();

    if (budgetSearchError) {
      console.error(
        "Erreur recherche dépense :",
        budgetSearchError.message
      );
      continue;
    }

    // Prix Booking > 0
    if (newPrice > 0) {
      // Une dépense existe déjà → mise à jour
      if (existingBudgetItem) {
        const { error: budgetUpdateError } = await supabase
          .from("budget_items")
          .update({
            amount: newPrice,
            title: activity.title,
            category: activity.type,
          })
          .eq("id", existingBudgetItem.id);

        if (budgetUpdateError) {
          console.error(
            "Erreur mise à jour dépense :",
            budgetUpdateError.message
          );
        }
      }

      // Aucune dépense → création
      else {
        const { error: budgetInsertError } = await supabase
          .from("budget_items")
          .insert([
            {
              event_id: id,
              activity_id: activity.id,
              title: activity.title,
              amount: newPrice,
              category: activity.type,
            },
          ]);

        if (budgetInsertError) {
          console.error(
            "Erreur création dépense :",
            budgetInsertError.message
          );
        }
      }
    }

    // Prix Booking supprimé / mis à 0
    else if (existingBudgetItem) {
      const { error: budgetDeleteError } = await supabase
        .from("budget_items")
        .delete()
        .eq("id", existingBudgetItem.id);

      if (budgetDeleteError) {
        console.error(
          "Erreur suppression dépense :",
          budgetDeleteError.message
        );
      }
    }
  }

if (documentFiles.length > 0) {
  await uploadBookingDocuments(
    bookingId,
    documentFiles
  );
}

await loadBookingDocuments();

  closeBookingForm();
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
    console.error(
      "toggleBookingReserved error:",
      error.message
    );

    setBookings((prev: any[]) =>
      prev.map((item) =>
        item.id === booking.id
          ? { ...item, is_reserved: booking.is_reserved }
          : item
      )
    );
  }
}


// ===============================
// CATÉGORIES
// ===============================

const bookingCategories = [
  {
    value: "activite",
    label: "Activité",
    icon: Ticket,
    color: "#A8BFA5",
  },
  {
    value: "rdv",
    label: "Rendez-vous",
    icon: CalendarClock,
    color: "#7F9A82",
  },
  {
    value: "evenement",
    label: "Événement",
    icon: CalendarDays,
    color: "#C9A66B",
  },
  {
    value: "transport",
    label: "Transport",
    icon: Plane,
    color: "#8FAFB9",
  },
  {
    value: "repas",
    label: "Repas",
    icon: Utensils,
    color: "#D7B4A5",
  },
  {
    value: "hebergement",
    label: "Hébergement",
    icon: BedDouble,
    color: "#B7A98D",
  },
  {
    value: "autre",
    label: "Autre",
    icon: Shapes,
    color: "#B8B0A5",
  },
];

function getBookingCategory(type?: string | null) {
  return (
    bookingCategories.find(
      (category) => category.value === type
    ) || bookingCategories[6]
  );
}


// ===============================
// AFFICHAGE
// ===============================


return (
  <div style={{ padding: 20, background: "#F4F1EC" }}>

    {/* HEADER */}
    <div style={bookingsHeader}>
      <h1 style={bookingsTitle}>
        {event?.title || "Bookings"}
      </h1>

      <button
  onClick={() => {
    if (showForm) {
      closeBookingForm();
    } else {
      resetBookingForm();
      setShowForm(true);
    }
  }}
  style={btn}
>
  Ajouter une réservation
</button>
    </div>

{showForm && (
  <div style={formCard}>
    <h2 style={formTitle}>
      {editingBookingId
        ? "Modifier la réservation"
        : "Nouvelle réservation"}
    </h2>

    <label style={fieldLabel}>Nom</label>

    <input
      placeholder="Nom de la réservation"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      style={formInput}
    />

    <label style={fieldLabel}>Catégorie</label>

<select
  value={type}
  onChange={(event) => setType(event.target.value)}
  style={{
    ...formInput,
    borderLeft: `5px solid ${getBookingCategory(type).color}`,
  }}
>
  <option value="activite">Activité</option>
  <option value="rdv">RDV</option>
  <option value="evenement">Événement</option>
  <option value="transport">Transport</option>
  <option value="repas">Repas</option>
  <option value="hebergement">Hébergement</option>
  <option value="autre">Autre</option>
</select>

<div style={dateTimeRow}>
  <div style={{ flex: 1 }}>
    <label style={fieldLabel}>Date</label>

    <input
      type="date"
      value={bookingDate}
      onChange={(e) => setBookingDate(e.target.value)}
      style={formInput}
    />
  </div>

  <div style={{ flex: 1 }}>
    <label style={fieldLabel}>Heure</label>

    <input
      type="time"
      step="60"
      value={bookingTime}
      onChange={(e) => setBookingTime(e.target.value)}
      style={formInput}
    />
  </div>
</div>

    <label style={fieldLabel}>Prix</label>

    <input
      type="number"
      min="0"
      step="0.01"
      placeholder="0 €"
      value={price}
      onChange={(e) => setPrice(e.target.value)}
      style={formInput}
    />

    <label style={fieldLabel}>Notes</label>

    <textarea
      placeholder="Ajouter une note..."
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      style={formTextarea}
    />

<label style={fieldLabel}>Documents</label>

<label style={documentUploadButton}>
  📎 Ajouter des documents

  <input
    type="file"
    multiple
    onChange={(event) => {
      const files = Array.from(
        event.target.files || []
      );

      setDocumentFiles((prev) => [
        ...prev,
        ...files,
      ]);

      event.target.value = "";
    }}
    style={{ display: "none" }}
  />
</label>

{documentFiles.length > 0 && (
  <div style={selectedDocumentsList}>
    {documentFiles.map((file, index) => (
      <div
        key={`${file.name}-${index}`}
        style={selectedDocumentRow}
      >
        <span>📎 {file.name}</span>

        <button
          type="button"
          onClick={() =>
            setDocumentFiles((prev) =>
              prev.filter((_, i) => i !== index)
            )
          }
          style={removeDocumentBtn}
        >
          ×
        </button>
      </div>
    ))}
  </div>
)}

    <div style={checkboxRow}>
      <label style={checkboxLabel}>
        <input
          type="checkbox"
          checked={isReserved}
          onChange={(e) =>
            setIsReserved(e.target.checked)
          }
        />

        <span>Réservé</span>
      </label>

      <label style={checkboxLabel}>
        <input
          type="checkbox"
          checked={isPaid}
          onChange={(e) =>
            setIsPaid(e.target.checked)
          }
        />

        <span>Payé</span>
      </label>
    </div>

    <div style={formActions}>
      <button
        type="button"
        onClick={closeBookingForm}
        style={secondaryBtn}
      >
        Annuler
      </button>

<button
  type="button"
  disabled={uploadingDocuments}
  onClick={() => {
    if (editingBookingId) {
      updateBooking(editingBookingId);
    } else {
      addBooking();
    }
  }}
  style={{
    ...primaryBtn,
    opacity: uploadingDocuments ? 0.6 : 1,
    cursor: uploadingDocuments ? "not-allowed" : "pointer",
  }}
>
  {uploadingDocuments
    ? "Envoi..."
    : editingBookingId
    ? "Enregistrer"
    : "Créer"}
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

    {/* NOUVEL AFFICHAGE */}

<div style={bookingColumns}>

  {/* CATÉGORIE */}
  <div
    style={{
      ...bookingCategoryBadge,
      background: getBookingCategory(booking.type).color,
      gridColumn: "1",
      gridRow: "1 / 3",
      alignSelf: "center",
    }}
  >
    {getBookingCategory(booking.type).label}
  </div>

  {/* TITRE */}
  <strong style={bookingMainTitle}>
    {booking.name || "Réservation"}
  </strong>

  {/* DATE */}
  {booking.booking_date && (
    <span style={bookingMetaValue}>
      {new Date(
        `${booking.booking_date}T00:00:00`
      ).toLocaleDateString("fr-FR")}
    </span>
  )}

  {/* HEURE */}
  {booking.booking_time && (
    <span style={bookingMetaValue}>
      {booking.booking_time.slice(0, 5)}
    </span>
  )}

  {/* PRIX */}
  {booking.price !== null &&
    booking.price !== undefined &&
    Number(booking.price) > 0 && (
      <span style={bookingPrice}>
        {Number(booking.price).toLocaleString("fr-FR")} €
      </span>
    )}

  {/* RÉSERVÉ */}
  {booking.is_reserved && (
    <span style={reservedDisplayBadge}>
      Réservé
    </span>
  )}

  {/* PAYÉ */}
  {booking.is_paid && (
    <span style={paidDisplayBadge}>
      Payé
    </span>
  )}

  {/* NOTE */}
  {booking.notes?.trim() && (
    <p style={bookingDescription}>
      {booking.notes}
    </p>
  )}

{bookingDocuments.some(
  (document) => document.booking_id === booking.id
) && (
  <div style={bookingDocumentsDisplay}>
    {bookingDocuments
      .filter(
        (document) =>
          document.booking_id === booking.id
      )
      .map((document) => (
        <div
          key={document.id}
          style={bookingDocumentItem}
        >
          <a
  href={document.signed_url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            style={bookingDocumentLink}
          >
            📎 {document.file_name}
          </a>

          <button
            type="button"
            title="Supprimer le document"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();

              deleteBookingDocument(document);
            }}
            style={deleteStoredDocumentBtn}
          >
            ×
          </button>
        </div>
      ))}
  </div>
)}

</div>
</div> {/* ferme bookingContent */}

{/* CRAYON À DROITE */}
<div style={{ position: "relative", flexShrink: 0 }}>
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
</div>
))
)}
</div>
    </div>
  );
}

// ===============================
// STYLES
// ===============================


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

const formTitle = {
  margin: "0 0 20px",
  fontSize: 22,
  fontWeight: 700,
  color: "#222222",
};

const fieldLabel = {
  display: "block",
  marginTop: 16,
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 700,
  color: "#6F6A61",
};

const formInput = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "11px 12px",
  border: "1px solid #DED8CE",
  borderRadius: 10,
  background: "#FAFAF8",
  color: "#222222",
  outline: "none",
};

const formTextarea = {
  ...formInput,
  minHeight: 90,
  resize: "vertical" as const,
  fontFamily: "inherit",
};

const checkboxRow = {
  display: "flex",
  alignItems: "center",
  gap: 30,
  marginTop: 20,
};

const checkboxLabel = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  color: "#222222",
  fontSize: 14,
  fontWeight: 600,
};

const formActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 24,
};

const categoryBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 9px",
  borderRadius: 999,
  color: "#222222",
  fontSize: 12,
  fontWeight: 600,
};

const dateTimeRow = {
  display: "flex",
  gap: 12,
};

const bookingColumns: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "100px minmax(280px, 1fr) 100px 70px 80px 80px 70px",
  columnGap: 16,
  alignItems: "center",
  width: "100%",
};

const bookingCategoryBadge: React.CSSProperties = {
  width: 100,
  height: 30,

  display: "flex",
  justifyContent: "center",
  alignItems: "center",

  borderRadius: 999,
  color: "white",
  fontSize: 12,
  fontWeight: 700,

  textTransform: "capitalize",
  boxSizing: "border-box",
  flexShrink: 0,
};

const bookingMainTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: "#222222",
  minWidth: 0,
};

const bookingMetaValue: React.CSSProperties = {
  fontSize: 14,
  color: "#555555",
  whiteSpace: "nowrap",
};

const bookingPrice: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#222222",
  whiteSpace: "nowrap",
};

const reservedDisplayBadge: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 999,
  background: "#E2EAF0",
  color: "#527887",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const paidDisplayBadge: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 999,
  background: "#DDEBDD",
  color: "#557058",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const bookingDescription: React.CSSProperties = {
  gridColumn: "2 / -1",
  gridRow: "2",
  margin: "6px 0 0",
  fontSize: 13,
  lineHeight: 1.5,
  color: "#6F6A61",
};

const documentUploadButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "9px 12px",
  border: "1px solid #DED8CE",
  borderRadius: 10,
  background: "#FAFAF8",
  color: "#222222",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const selectedDocumentsList: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginTop: 10,
};

const selectedDocumentRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 8,
  background: "#F4F1EC",
  fontSize: 13,
};

const removeDocumentBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 18,
  color: "#A05245",
  padding: 0,
};

const bookingDocumentsDisplay: React.CSSProperties = {
  gridColumn: "2 / -1",
  gridRow: "3",
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 7,
};

const bookingDocumentLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  color: "#557058",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 600,
  minWidth: 0,
};

const bookingDocumentItem: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "5px 8px 5px 9px",
  borderRadius: 8,
  background: "#EEEAE3",
};

const bookingsTitle = {
  margin: 0,
  fontSize: 34,
  fontWeight: 800,
  color: "#222222",
};

const bookingsHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  marginBottom: 24,
};

const deleteStoredDocumentBtn: React.CSSProperties = {
  width: 18,
  height: 18,
  padding: 0,
  border: "none",
  borderRadius: "50%",
  background: "transparent",
  color: "#A05245",
  cursor: "pointer",
  fontSize: 17,
  lineHeight: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};