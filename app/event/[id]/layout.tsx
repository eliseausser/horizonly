"use client";

import Link from "next/link";
import { use } from "react";

export default function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  // Next 16 : unwrap params
  const { id } = use(params);

  return (
    <div>
      {/* TOP NAV */}
      <div
        style={{
          padding: 15,
          borderBottom: "1px solid #ddd",
          position: "sticky",
          top: 0,
          background: "white",
        }}
      >
        <h2 style={{ marginBottom: 10 }}>
          Event Workspace
        </h2>

        <div style={{ display: "flex", gap: 15 }}>
          <Link href={`/event/${id}`}>
            Overview
          </Link>

          <Link href={`/event/${id}/planning`}>
            Planning
          </Link>

          <Link href={`/event/${id}/reservations`}>
            Reservations
          </Link>

          <Link href={`/event/${id}/budget`}>
            Budget
          </Link>
        </div>
      </div>

      {/* PAGE CONTENT */}
      <div style={{ padding: 30 }}>
        {children}
      </div>
    </div>
  );
}