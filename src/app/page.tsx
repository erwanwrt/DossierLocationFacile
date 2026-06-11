import Link from "next/link";
import styles from "@/styles/components.module.css";
import { Building2, ShieldCheck, FolderUp, CheckSquare, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header className={styles.navbar}>
        <div className={styles.logo}>
          <Building2 size={22} strokeWidth={2.5} />
          <span>Dossier Location Facile</span>
        </div>
        <Link 
          href="/dashboard" 
          className={`${styles.btn} ${styles.btnOutline}`}
          style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}
        >
          Connexion Propriétaire
        </Link>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <section style={{ 
          padding: "5rem 1.5rem", 
          textAlign: "center", 
          background: "linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)",
          borderBottom: "1px solid var(--border-color)"
        }} className="animate-fade-in">
          <div className={styles.containerNarrow}>
            <span style={{ 
              display: "inline-block", 
              backgroundColor: "var(--primary-light)", 
              color: "var(--primary)", 
              padding: "0.3rem 0.75rem", 
              borderRadius: "9999px", 
              fontSize: "0.8rem", 
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "1.5rem"
            }}>
              Pour les Propriétaires Particuliers
            </span>
            <h1 style={{ 
              fontSize: "2.75rem", 
              fontWeight: 800, 
              lineHeight: 1.15, 
              letterSpacing: "-0.03em", 
              marginBottom: "1.25rem",
              color: "var(--primary)"
            }}>
              Récupérez vos dossiers de location en toute simplicité
            </h1>
            <p style={{ 
              color: "var(--text-secondary)", 
              fontSize: "1.1rem", 
              lineHeight: 1.6, 
              marginBottom: "2.5rem" 
            }}>
              Créez vos biens immobiliers, générez des liens de candidature publics et recevez les dossiers locataires complets (avec garants) directement dans votre Google Drive personnel.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
              <Link 
                href="/dashboard" 
                className={`${styles.btn} ${styles.btnPrimary}`}
                style={{ height: "48px", padding: "0 2rem", fontSize: "1rem" }}
              >
                <span>Accéder à mon espace</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className={styles.container} style={{ padding: "5rem 1.5rem" }}>
          <h2 style={{ 
            fontSize: "1.75rem", 
            fontWeight: 800, 
            textAlign: "center", 
            marginBottom: "3.5rem",
            letterSpacing: "-0.02em" 
          }}>
            Une gestion simplifiée et sécurisée
          </h2>

          <div className={styles.grid3}>
            {/* Feature 1 */}
            <div className={styles.card} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--primary-light)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <FolderUp size={24} />
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Stockage Google Drive</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                Toutes les pièces justificatives des locataires sont directement téléversées dans un dossier structuré (sous-dossier par propriété, puis sous-dossier par candidat) sur votre Google Drive.
              </p>
            </div>

            {/* Feature 2 */}
            <div className={styles.card} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--primary-light)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <ShieldCheck size={24} />
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Sans compte pour le locataire</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                Le locataire accède à votre lien unique de candidature et dépose son dossier sans avoir besoin de s'inscrire ou de se connecter, garantissant un taux de complétion maximal.
              </p>
            </div>

            {/* Feature 3 */}
            <div className={styles.card} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--primary-light)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <CheckSquare size={24} />
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Formulaire dynamique</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                Le formulaire s'adapte automatiquement en fonction du profil du candidat (Salarié, Étudiant, avec ou sans garant Visale/physique) pour ne demander que les documents strictement nécessaires.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ 
        borderTop: "1px solid var(--border-color)", 
        padding: "2rem 1.5rem", 
        textAlign: "center", 
        backgroundColor: "var(--bg-secondary)",
        color: "var(--text-muted)",
        fontSize: "0.85rem"
      }}>
        <p>© {new Date().getFullYear()} Dossier Location Facile. Conçu pour une gestion locative simple et sécurisée.</p>
      </footer>
    </div>
  );
}
