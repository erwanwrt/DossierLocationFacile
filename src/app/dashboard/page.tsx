import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import CreatePropertyModal from "@/components/CreatePropertyModal";
import CopyButton from "@/components/CopyButton";
import ToggleFormStatusButton from "@/components/ToggleFormStatusButton";
import DeletePropertyButton from "@/components/DeletePropertyButton";
import styles from "@/styles/components.module.css";
import { Building2, Eye, FileText, LayoutGrid, MapPin, Share2 } from "lucide-react";

export default async function DashboardPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || !session.user) {
    redirect("/login");
  }

  // Determine origin for public share links
  const host = headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  const origin = `${protocol}://${host}`;

  // Fetch properties with forms and submissions count
  const { data: properties, error } = await supabaseAdmin
    .from("properties")
    .select(`
      id,
      title,
      description,
      address,
      slug,
      created_at,
      forms ( require_guarantor, is_active ),
      submissions ( id, status )
    `)
    .eq("owner_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching properties:", error);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header userName={session.user.name || session.user.email} />

      <main className={styles.container} style={{ flex: 1, paddingBottom: "4rem" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2.5rem",
          flexWrap: "wrap",
          gap: "1rem"
        }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.025em", marginBottom: "0.25rem" }}>
              Tableau de bord
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Gérez vos biens immobiliers et consultez les dossiers de candidature reçus.
            </p>
          </div>
          <CreatePropertyModal />
        </div>

        {properties && properties.length > 0 ? (
          <div className={styles.grid3} style={{ marginTop: "1rem" }}>
            {properties.map((property: any) => {
              const totalSubmissions = property.submissions?.length || 0;
              const pendingSubmissions = property.submissions?.filter((s: any) => s.status === "pending").length || 0;
              const publicLink = `${origin}/p/${property.slug}`;
              const formConfig = Array.isArray(property.forms) ? property.forms[0] : property.forms;

              return (
                <div key={property.id} className={`${styles.card} ${styles.cardHover}`} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <div style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--primary-light)",
                      color: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <Building2 size={20} />
                    </div>
                    
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <CopyButton text={publicLink} />
                      <ToggleFormStatusButton propertyId={property.id} isActive={formConfig?.is_active ?? true} />
                      <DeletePropertyButton propertyId={property.id} propertyTitle={property.title} />
                    </div>
                  </div>

                  <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                    {property.title}
                  </h3>

                  <p style={{ 
                    fontSize: "0.875rem", 
                    color: "var(--text-secondary)", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "0.3rem",
                    marginBottom: "1rem"
                  }}>
                    <MapPin size={14} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {property.address}
                    </span>
                  </p>

                  {property.description && (
                    <p style={{ 
                      fontSize: "0.875rem", 
                      color: "var(--text-muted)", 
                      marginBottom: "1.5rem",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      height: "2.5rem"
                    }}>
                      {property.description}
                    </p>
                  )}

                  <div style={{ 
                    marginTop: "auto", 
                    borderTop: "1px solid var(--border-color)", 
                    paddingTop: "1.25rem", 
                    display: "flex", 
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1.5rem"
                  }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600, color: "var(--text-muted)", display: "block" }}>
                        Candidatures
                      </span>
                      <span style={{ fontSize: "1.25rem", fontWeight: 800 }}>
                        {totalSubmissions}
                      </span>
                      {pendingSubmissions > 0 && (
                        <span style={{ 
                          fontSize: "0.75rem", 
                          color: "var(--warning)", 
                          backgroundColor: "var(--warning-light)", 
                          padding: "0.1rem 0.4rem", 
                          borderRadius: "4px",
                          marginLeft: "0.5rem",
                          fontWeight: 500
                        }}>
                          {pendingSubmissions} nouv.
                        </span>
                      )}
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600, color: "var(--text-muted)", display: "block" }}>
                        Formulaire
                      </span>
                      <span className={styles.badge} style={{ 
                        fontSize: "0.7rem", 
                        padding: "0.1rem 0.5rem",
                        backgroundColor: formConfig?.is_active ? "var(--success-light)" : "var(--border-color)",
                        color: formConfig?.is_active ? "var(--success)" : "var(--text-muted)"
                      }}>
                        {formConfig?.is_active ? "Actif" : "Inactif"}
                      </span>
                    </div>
                  </div>

                  <Link 
                    href={`/dashboard/submissions/${property.id}`}
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    style={{ width: "100%", textDecoration: "none" }}
                  >
                    <Eye size={16} />
                    <span>Voir les dossiers</span>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.card} style={{
            textAlign: "center",
            padding: "4rem 2rem",
            marginTop: "2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.25rem"
          }}>
            <Building2 size={48} style={{ color: "var(--text-muted)", marginBottom: "0.5rem" }} />
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Aucune propriété pour le moment</h3>
            <p style={{ color: "var(--text-secondary)", maxWidth: "450px" }}>
              Créez votre première propriété en cliquant sur le bouton ci-dessus pour générer un formulaire de candidature et un lien de partage.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
