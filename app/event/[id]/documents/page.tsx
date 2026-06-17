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

    const { data: budgetItems } = await supabase
      .from("budget_items")
      .select("id, title, document_url, document_name, link, created_at")
      .eq("event_id", id);

    (budgetItems || []).forEach((item) => {
      if (item.document_url) {
        allDocs.push({
          id: `budget-doc-${item.id}`,
          name: item.document_name || item.title || "Document budget",
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

    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, name, document_url, document_name, link, created_at")
      .eq("event_id", id);

    (bookings || []).forEach((booking) => {
      if (booking.document_url) {
        allDocs.push({
          id: `booking-doc-${booking.id}`,
          name: booking.document_name || booking.name || "Document booking",
          url: booking.document_url,
          source: "Bookings",
          relatedTitle: booking.name,
          created_at: booking.created_at,
        });
      }

      if (booking.link) {
        allDocs.push({
          id: `booking-link-${booking.id}`,
          name: booking.name || "Lien booking",
          url: booking.link,
          source: "Bookings",
          relatedTitle: booking.name,
          created_at: booking.created_at,
          isLink: true,
        });
      }
    });

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