"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DocumentsPage() {
  const { id } = useParams();

  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [id]);

async function loadDocuments() {
  setLoading(true);

  const allDocs: any[] = [];

  // =====================================================
  // DOCUMENTS ET LIENS DU BUDGET
  // =====================================================

  const { data: budgetItems, error: budgetError } = await supabase
    .from("budget_items")
    .select(
      "id, title, document_url, document_name, link, created_at"
    )
    .eq("event_id", id);

  if (budgetError) {
    console.error(
      "Erreur chargement documents Budget :",
      budgetError.message
    );
  }

  (budgetItems || []).forEach((item) => {
    if (item.document_url) {
      allDocs.push({
        id: `budget-doc-${item.id}`,
        name:
          item.document_name ||
          item.title ||
          "Document budget",
        url: item.document_url,
        source: "Budget",
        relatedTitle: item.title,
        created_at: item.created_at,
      });
    }

    if (item.link) {
      allDocs.push({
        id: `budget-link-${item.id}`,
        name: item.title || "Lien budget",
        url: item.link,
        source: "Budget",
        relatedTitle: item.title,
        created_at: item.created_at,
        isLink: true,
      });
    }
  });

  // =====================================================
  // RÉSERVATIONS DU PROJET
  // =====================================================

  const { data: bookings, error: bookingsError } =
    await supabase
      .from("bookings")
      .select("id, name, created_at")
      .eq("event_id", id);

  if (bookingsError) {
    console.error(
      "Erreur chargement réservations :",
      bookingsError.message
    );
  }

  const bookingIds = (bookings || []).map(
    (booking) => booking.id
  );

  const bookingsById = new Map(
    (bookings || []).map((booking) => [
      booking.id,
      booking,
    ])
  );

  // =====================================================
  // DOCUMENTS DES RÉSERVATIONS
  // =====================================================

  if (bookingIds.length > 0) {
    const {
      data: bookingDocuments,
      error: bookingDocumentsError,
    } = await supabase
      .from("booking_documents")
      .select(
        "id, booking_id, file_name, storage_path, created_at"
      )
      .in("booking_id", bookingIds);

    if (bookingDocumentsError) {
      console.error(
        "Erreur chargement documents Booking :",
        bookingDocumentsError.message
      );
    }

    for (const document of bookingDocuments || []) {
      const booking = bookingsById.get(
        document.booking_id
      );

      // Le bucket est privé :
      // on crée une URL temporaire valable 1 heure.
      const { data: signedData, error: signedError } =
        await supabase.storage
          .from("booking-documents")
          .createSignedUrl(
            document.storage_path,
            60 * 60
          );

      if (signedError) {
        console.error(
          "Erreur création URL document :",
          signedError.message
        );

        continue;
      }

      allDocs.push({
        id: `booking-doc-${document.id}`,
        name:
          document.file_name ||
          booking?.name ||
          "Document réservation",
        url: signedData.signedUrl,
        source: "Réservation",
        relatedTitle:
          booking?.name || "Réservation",
        created_at: document.created_at,
      });
    }
  }

  // =====================================================
  // TRI DU PLUS RÉCENT AU PLUS ANCIEN
  // =====================================================

  allDocs.sort(
    (a, b) =>
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime()
  );

  setDocuments(allDocs);
  setLoading(false);
}

  if (loading) return <p>Chargement...</p>;

  return (
    <div>
      <h1>📄 Documents</h1>

      {documents.length === 0 ? (
        <p>Aucun document joint pour ce projet.</p>
      ) : (
        <div style={grid}>
          {documents.map((doc) => (
            <a
              key={doc.id}
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              style={card}
            >
              <div style={icon}>{doc.isLink ? "🔗" : "📄"}</div>

              <div>
                <h3 style={{ margin: 0 }}>{doc.name}</h3>

                <p style={meta}>
                  Source : <strong>{doc.source}</strong>
                </p>

                {doc.relatedTitle && (
                  <p style={meta}>Lié à : {doc.relatedTitle}</p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: 15,
  marginTop: 20,
};

const card = {
  display: "flex",
  gap: 12,
  padding: 16,
  border: "1px solid #ddd",
  borderRadius: 12,
  background: "white",
  textDecoration: "none",
  color: "inherit",
};

const icon = {
  fontSize: 28,
};

const meta = {
  margin: "6px 0 0 0",
  color: "#666",
  fontSize: 14,
};