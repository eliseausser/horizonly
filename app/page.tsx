import Link from "next/link";
import { CSSProperties } from "react";

export default function Home() {
  return (
    <main style={styles.container}>
      
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logoContainer}>
<img
  src="/logo.svg"
  alt="MERGE"
  style={{
    width: 52,
    height: 52,
    objectFit: "contain",
    display: "block",
  }}
/>

  <h1 style={styles.logo}>MERGE</h1>
</div>

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
      </section>

    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
  minHeight: "100vh",
  background: "#F4F1EC",
},
logoContainer: {
  display: "flex",
  alignItems: "center",
  gap: "12px",
},
  header: {
    display: "flex",
    justifyContent: "space-between",
    padding: "20px 40px",
    alignItems: "center",
  },
  logo: {
  fontSize: "24px",
  fontWeight: "700",
  color: "#222222",
  margin: 0,
},
loginButton: {
  padding: "10px 18px",
  borderRadius: "12px",
  border: "none",
  background: "#222222",
  color: "#FAFAF8",
  cursor: "pointer",
  fontWeight: 600,
},
  hero: {
    textAlign: "center",
    marginTop: "120px",
    padding: "0 20px",
  },
  title: {
  fontSize: "56px",
  fontWeight: "700",
  color: "#6E8570",
  lineHeight: 1.1,
},
  subtitle: {
  fontSize: "20px",
  fontWeight: 400,
  color: "#A8BFA5",
  lineHeight: 1.7,
  maxWidth: "650px",
  margin: "20px auto 0",
},
cta: {
  marginTop: "36px",
  padding: "15px 28px",
  fontSize: "16px",
  fontWeight: 600,
  borderRadius: "14px",
  border: "none",
  background: "#6E8570",
  color: "#F4F1EC",
  cursor: "pointer",
},

};