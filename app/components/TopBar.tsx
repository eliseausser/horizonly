"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

export default function TopBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <header style={topbar}>
<div
  style={logoContainer}
  onClick={() => router.push("/dashboard")}
>
  <img
    src="/logo.svg"
    alt="MERGE"
    style={{
      width: 38,
      height: 38,
      objectFit: "contain",
      display: "block",
    }}
  />

  <span style={logo}>MERGE</span>
</div>

      <div style={rightSide}>
        <button style={profileButton} onClick={() => setOpen(!open)}>
          Mon compte ▾
        </button>

        {open && (
          <div style={dropdown}>
            <button style={menuItem} onClick={() => router.push("/dashboard")}>
              Mes projets
            </button>

	    <button style={menuItem} onClick={() => router.push("/archives")}>
              Archives
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
  height: 74,
  background: "#F4F1EC",
  borderBottom: "1px solid #E5DED4",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 36px",
};

const logoContainer = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  cursor: "pointer",
};

const logo = {
  fontSize: 24,
  fontWeight: 700,
  color: "#222222",
  letterSpacing: "-0.4px",
};

const rightSide = {
  position: "relative" as const,
};

const profileButton = {
  border: "1px solid #D9D2C8",
  background: "#FAFAF8",
  color: "#222222",
  padding: "11px 18px",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 600,
  transition: "0.2s",
};

const dropdown = {
  position: "absolute" as const,
  right: 0,
  top: 54,
  width: 210,
  background: "#FAFAF8",
  border: "1px solid #E5DED4",
  borderRadius: 16,
  overflow: "hidden",
  boxShadow: "0 18px 40px rgba(34,34,34,0.08)",
};

const menuItem = {
  width: "100%",
  border: "none",
  background: "#FAFAF8",
  color: "#222222",
  padding: "14px 18px",
  textAlign: "left" as const,
  cursor: "pointer",
  fontWeight: 500,
};

const logoutItem = {
  ...menuItem,
  color: "#6E8570",
};