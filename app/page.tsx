import Link from "next/link";
import { CSSProperties } from "react";

export default function Home() {
  return (
    <main style={styles.container}>
      
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.logo}>Horizonly ✈️</h1>

        <Link href="/login">
          <button style={styles.loginButton}>
            Connexion
          </button>
        </Link>
      </header>

      {/* Hero Section */}
      <section style={styles.hero}>
        <h2 style={styles.title}>
          Planifiez vos prochaines aventures
        </h2>

        <p style={styles.subtitle}>
          Planifie tes itinéraires, ajoute tes activités et
          organise tes voyages en un seul endroit.
        </p>

        <Link href="/login">
          <button style={styles.cta}>
            Créer un voyage
          </button>
        </Link>
      </section>

    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "#f5f5f5",
    fontFamily: "sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    padding: "20px 40px",
    alignItems: "center",
  },
  logo: {
    fontSize: "24px",
    fontWeight: "bold",
  },
  loginButton: {
    padding: "10px 16px",
    borderRadius: "10px",
    border: "none",
    background: "black",
    color: "white",
    cursor: "pointer",
  },
  hero: {
    textAlign: "center",
    marginTop: "120px",
    padding: "0 20px",
  },
  title: {
    fontSize: "48px",
    fontWeight: "bold",
  },
  subtitle: {
    marginTop: "20px",
    fontSize: "18px",
    color: "#555",
    maxWidth: "600px",
    marginLeft: "auto",
    marginRight: "auto",
  },
  cta: {
    marginTop: "30px",
    padding: "14px 24px",
    fontSize: "16px",
    borderRadius: "12px",
    border: "none",
    background: "black",
    color: "white",
    cursor: "pointer",
  },
};