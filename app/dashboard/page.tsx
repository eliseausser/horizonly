"use client";

// React hooks :
// useState = stocker des données (user, profile, loading)
// useEffect = exécuter du code au chargement de la page
import { useEffect, useState } from "react";

// Next.js router : permet de rediriger l’utilisateur (ex: vers /login)
import { useRouter } from "next/navigation";

// Supabase client (connexion à ta base de données + auth)
import { supabase } from "@/lib/supabase";

// Type TypeScript pour décrire un utilisateur Supabase
import type { User } from "@supabase/supabase-js";

// Type personnalisé pour ton profil (table "profiles" dans Supabase)
type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export default function Dashboard() {

  // router = permet de changer de page (redirect login si pas connecté)
  const router = useRouter();

  // loading = affiche "Chargement..." tant que les données arrivent
  const [loading, setLoading] = useState(true);

  // user = utilisateur connecté (Supabase Auth)
  const [user, setUser] = useState<User | null>(null);

  // profile = données personnalisées venant de ta table "profiles"
  const [profile, setProfile] = useState<Profile | null>(null);

  // useEffect = se lance automatiquement au chargement de la page dashboard
  useEffect(() => {

    // fonction async pour récupérer user + profile
    async function load() {

      // 1. Récupérer la session utilisateur depuis Supabase Auth
      const { data: { session } } = await supabase.auth.getSession();

      // Si aucune session = utilisateur pas connecté
      if (!session) {
        // redirection vers login
        router.push("/login");
        return; // stop le code ici
      }

      // On récupère l'utilisateur connecté
      const currentUser = session.user;

      // On stocke l'utilisateur dans le state React
      setUser(currentUser);

      // 2. Récupérer le profil associé dans la table "profiles"
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*") // on prend toutes les colonnes
        .eq("id", currentUser.id) // on filtre sur l'id du user
        .single(); // on attend un seul résultat

      // Si erreur dans la requête Supabase
      if (error) {
        console.error("Erreur profil:", error.message);
      }

      // On stocke le profil dans React
      setProfile(profileData);

      // On indique que le chargement est terminé
      setLoading(false);
    }

    // on appelle la fonction
    load();

  }, [router]); // dépendance : relance si router change

  // Fonction logout (déconnexion utilisateur)
  async function handleLogout() {
    await supabase.auth.signOut(); // supprime la session Supabase
    router.push("/login"); // redirige vers login
  }

  // Tant que les données ne sont pas chargées
  if (loading) return <p>Chargement...</p>;

  return (
    <div style={{ padding: 40 }}>

      {/* Titre du dashboard */}
      <h1>Dashboard ✈️</h1>

      {/* SECTION USER PROFILE */}
      {/* affichée seulement si profile existe */}
      {profile && (
        <div style={{ marginTop: 20 }}>

          {/* avatar utilisateur (si existant) */}
          {profile.avatar_url && (
            <img
              src={profile.avatar_url}
              width={60}
              style={{ borderRadius: "50%" }}
              alt="avatar"
            />
          )}

          {/* nom utilisateur */}
          <p style={{ fontSize: 18 }}>
            Bienvenue {profile.full_name ?? "Utilisateur"}
            {/* si full_name est null → affiche "Utilisateur" */}
          </p>
        </div>
      )}

      {/* DEBUG (utile pour développement) */}
      {/* affiche l'id utilisateur Supabase */}
      {user && (
        <p style={{ fontSize: 12, opacity: 0.6 }}>
          user id: {user.id}
        </p>
      )}

      {/* BOUTON DE DÉCONNEXION */}
      <button
        onClick={handleLogout}
        style={{
          marginTop: 20,
          padding: "10px 16px",
          borderRadius: "10px",
          border: "none",
          background: "red",
          color: "white",
          cursor: "pointer",
        }}
      >
        Déconnexion
      </button>
    </div>
  );
}