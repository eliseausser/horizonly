"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function TopBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <header style={topbar}>
      <div style={logo} onClick={() => router.push("/dashboard")}>
        HORIZONLY
      </div>

      <div style={rightSide}>
        <button style={profileButton} onClick={() => setOpen(!open)}>
          👤 Profil ▾
        </button>

        {open && (
          <div style={dropdown}>
            <button style={menuItem} onClick={() => router.push("/dashboard")}>
              Mes projets
            </button>

            <button style={menuItem} onClick={() => router.push("/myaccount")}>
              Mon compte
            </button>

            <button style={logoutItem} onClick={handleLogout}>
              Déconnexion
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

const topbar = {
  position: "sticky" as const,
  top: 0,
  zIndex: 1000,
  height: 70,
  background: "white",
  borderBottom: "1px solid #eee",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 28px",
};

const logo = {
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: "-0.5px",
  cursor: "pointer",
};

const rightSide = {
  position: "relative" as const,
};

const profileButton = {
  border: "1px solid #ddd",
  background: "#f8f8f8",
  padding: "10px 14px",
  borderRadius: 999,
  cursor: "pointer",
};

const dropdown = {
  position: "absolute" as const,
  right: 0,
  top: 48,
  width: 180,
  background: "white",
  border: "1px solid #ddd",
  borderRadius: 14,
  overflow: "hidden",
  boxShadow: "0 12px 35px rgba(0,0,0,0.12)",
};

const menuItem = {
  width: "100%",
  border: "none",
  background: "white",
  padding: "12px 16px",
  textAlign: "left" as const,
  cursor: "pointer",
};

const logoutItem = {
  ...menuItem,
  color: "red",
};