import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import SubmissionStatusActions from "@/components/SubmissionStatusActions";
import styles from "@/styles/components.module.css";
import { ArrowLeft, Calendar, FileText, Mail, Phone, Wallet, Users, FolderOpen, MessageSquare } from "lucide-react";

const DOC_NAMES: Record<string, string> = {
  tenant_cni: "Pièce d'identité (CNI)",
  tenant_payslips: "3 dernières fiches de paie",
  tenant_school_cert: "Certificat de scolarité",
  tenant_tax_notice: "Dernier avis d'imposition",
  tenant_rent_receipts: "3 dernières quittances de loyer",
  guarantor_visale: "Attestation de garantie Visale",
  guarantor_cni: "Pièce d'identité du garant",
  guarantor_payslips: "3 dernières fiches de paie du garant",
  guarantor_tax_notice: "Dernier avis d'imposition du garant",
  guarantor_address_proof: "Justificatif de domicile du garant",
  guarantor_letter: "Lettre de caution solidaire",
};

interface SubmissionsPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubmissionsPage({ params }: SubmissionsPageProps) {
  const { id: propertyId } = await params;
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || !session.user) {
    redirect("/login");
  }

  // Fetch property details
  const { data: property, error: propError } = await supabaseAdmin
    .from("properties")
    .select("id, title, address, owner_id")
    .eq("id", propertyId)
    .eq("owner_id", session.user.id)
    .single();

  if (propError || !property) {
    redirect("/dashboard");
  }

  // Fetch submissions for this property
  const { data: submissions, error: subError } = await supabaseAdmin
    .from("submissions")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (subError) {
    console.error("Error fetching submissions:", subError);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header userName={session.user.name || session.user.email} />

      <main className={styles.container} style={{ flex: 1, paddingBottom: "4rem" }}>
        <Link 
          href="/dashboard"
          className={styles.btnSecondary}
          style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: "0.5rem", 
            marginBottom: "2rem",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem"
          }}
        >
          <ArrowLeft size={16} />
          <span>Retour au tableau de bord</span>
        </Link>

        <div style={{ marginBottom: "2.5rem" }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Candidatures reçues
          </span>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.025em", marginTop: "0.25rem", marginBottom: "0.5rem" }}>
            {property.title}
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            {property.address}
          </p>
        </div>

        {submissions && submissions.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {submissions.map((submission: any) => {
              const formattedDate = new Date(submission.created_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              });

              // Status class helper
              let statusBadgeStyle = styles.badgePending;
              let statusLabel = "En attente";
              if (submission.status === "accepted") {
                statusBadgeStyle = styles.badgeSuccess;
                statusLabel = "Accepté";
              } else if (submission.status === "rejected") {
                statusBadgeStyle = styles.badgeError;
                statusLabel = "Refusé";
              }

              // Situation label helper
              let situationLabel = "Autre";
              if (submission.tenant_situation === "student") situationLabel = "Étudiant";
              else if (submission.tenant_situation === "employee") situationLabel = "Salarié";

              // Guarantor label helper
              let guarantorLabel = "Aucun";
              if (submission.guarantor_type === "visale") guarantorLabel = "Garantie Visale";
              else if (submission.guarantor_type === "physical") guarantorLabel = "Garant physique";

              return (
                <div key={submission.id} className={styles.card} style={{ borderLeft: "4px solid var(--primary)" }}>
                  {/* Submission Header */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "1rem",
                    borderBottom: "1px solid var(--border-color)",
                    paddingBottom: "1.25rem",
                    marginBottom: "1.5rem"
                  }}>
                    <div>
                      <h2 style={{ fontSize: "1.35rem", fontWeight: 700 }}>
                        {submission.tenant_first_name} {submission.tenant_last_name}
                      </h2>
                      <p style={{ 
                        fontSize: "0.85rem", 
                        color: "var(--text-muted)", 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "0.3rem",
                        marginTop: "0.25rem" 
                      }}>
                        <Calendar size={14} />
                        Déposé le {formattedDate}
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                      <span className={`${styles.badge} ${statusBadgeStyle}`}>
                        {statusLabel}
                      </span>
                      <SubmissionStatusActions 
                        submissionId={submission.id} 
                        currentStatus={submission.status} 
                      />
                    </div>
                  </div>

                  {/* Submission Body Details */}
                  <div className={styles.grid2} style={{ marginBottom: "1.5rem" }}>
                    <div>
                      <h3 style={{ fontSize: "0.9rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600, marginBottom: "0.75rem" }}>
                        Informations Locataire
                      </h3>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.95rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <Mail size={16} style={{ color: "var(--text-muted)" }} />
                          <a href={`mailto:${submission.tenant_email}`} style={{ color: "var(--primary)", textDecoration: "underline" }}>
                            {submission.tenant_email}
                          </a>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <Phone size={16} style={{ color: "var(--text-muted)" }} />
                          <a href={`tel:${submission.tenant_phone}`} style={{ color: "var(--text-secondary)" }}>
                            {submission.tenant_phone}
                          </a>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <Wallet size={16} style={{ color: "var(--text-muted)" }} />
                          <span>Revenus : <strong>{submission.tenant_income} € / mois</strong> ({situationLabel})</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <Users size={16} style={{ color: "var(--text-muted)" }} />
                          <span>Garant : <strong>{guarantorLabel}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Google Drive links section */}
                    <div>
                      <h3 style={{ 
                        fontSize: "0.9rem", 
                        textTransform: "uppercase", 
                        color: "var(--text-muted)", 
                        fontWeight: 600, 
                        marginBottom: "0.75rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem" 
                      }}>
                        <FolderOpen size={16} />
                        Documents joints
                      </h3>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {Object.entries(submission.files || {}).map(([key, link]: [string, any]) => {
                          const docName = DOC_NAMES[key] || key;
                          return (
                            <a
                              key={key}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.btnSecondary}
                              style={{
                                padding: "0.6rem 1rem",
                                fontSize: "0.875rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                justifyContent: "flex-start",
                                width: "100%",
                                textAlign: "left",
                                borderRadius: "var(--radius-md)"
                              }}
                            >
                              <FileText size={16} style={{ color: "var(--primary)" }} />
                              <span style={{ flex: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                {docName}
                              </span>
                              <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 500 }}>
                                Ouvrir ↗
                              </span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Tenant Comment if present */}
                  {submission.tenant_comment && (
                    <div style={{ 
                      marginTop: "1.5rem", 
                      paddingTop: "1.25rem", 
                      borderTop: "1px dashed var(--border-color)" 
                    }}>
                      <h3 style={{ 
                        fontSize: "0.9rem", 
                        textTransform: "uppercase", 
                        color: "var(--text-muted)", 
                        fontWeight: 600, 
                        marginBottom: "0.5rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem"
                      }}>
                        <MessageSquare size={16} style={{ color: "var(--primary)" }} />
                        Commentaire / Remarques du candidat
                      </h3>
                      <p style={{ 
                        fontSize: "0.95rem", 
                        color: "var(--text-secondary)", 
                        lineHeight: "1.5",
                        whiteSpace: "pre-wrap",
                        backgroundColor: "var(--bg-primary)",
                        padding: "0.75rem 1rem",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-color)",
                        marginTop: "0.5rem",
                        margin: 0
                      }}>
                        {submission.tenant_comment}
                      </p>
                    </div>
                  )}
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
            <FileText size={48} style={{ color: "var(--text-muted)", marginBottom: "0.5rem" }} />
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Aucune candidature</h3>
            <p style={{ color: "var(--text-secondary)", maxWidth: "450px" }}>
              Partagez le lien public de cette propriété pour commencer à recevoir des dossiers de candidature.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
