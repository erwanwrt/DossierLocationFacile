import { supabaseAdmin } from "@/lib/supabase";
import TenantApplicationForm from "@/components/TenantApplicationForm";
import styles from "@/styles/components.module.css";
import { Building2, XCircle } from "lucide-react";

interface TenantPageProps {
  params: Promise<{ slug: string }>;
}

export default async function TenantPage({ params }: TenantPageProps) {
  const { slug } = await params;

  // Fetch the property and its associated form config
  const { data: property, error } = await supabaseAdmin
    .from("properties")
    .select(`
      id,
      title,
      description,
      address,
      forms ( require_guarantor, is_active )
    `)
    .eq("slug", slug)
    .single();

  if (error || !property) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <div className={styles.card} style={{ maxWidth: "450px", textAlign: "center" }}>
          <XCircle size={48} style={{ color: "var(--error)", marginBottom: "1rem" }} />
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Lien invalide</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Cette annonce ou ce lien de candidature n'existe pas ou a été supprimé par le propriétaire.
          </p>
        </div>
      </div>
    );
  }

  const formConfig = Array.isArray(property.forms) ? property.forms[0] : property.forms;
  const isFormActive = formConfig ? formConfig.is_active : false;

  if (!isFormActive) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <div className={styles.card} style={{ maxWidth: "450px", textAlign: "center" }}>
          <XCircle size={48} style={{ color: "var(--warning)", marginBottom: "1rem" }} />
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Candidatures fermées</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Le propriétaire a suspendu ou fermé le dépôt de candidatures pour ce bien.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className={styles.navbar}>
        <div className={styles.logo}>
          <Building2 size={20} />
          <span>Dossier Location Facile</span>
        </div>
      </header>

      <main style={{ flex: 1, padding: "2rem 1rem", backgroundColor: "var(--bg-primary)" }}>
        <div className={styles.containerNarrow}>
          <div style={{ marginBottom: "2rem", textAlign: "center" }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.025em", marginBottom: "0.5rem" }}>
              Candidature pour la location
            </h1>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--primary)" }}>
              {property.title}
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
              {property.address}
            </p>
          </div>

          <TenantApplicationForm 
            propertyId={property.id} 
            propertyTitle={property.title} 
            requireGuarantor={formConfig.require_guarantor}
          />
        </div>
      </main>
    </div>
  );
}
