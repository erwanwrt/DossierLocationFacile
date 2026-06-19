"use client";

import { useState } from "react";
import styles from "@/styles/components.module.css";
import { User, Briefcase, ShieldAlert, FileUp, CheckCircle, Mail, Phone, UserCheck, AlertTriangle, MessageSquare } from "lucide-react";

interface TenantApplicationFormProps {
  propertyId: string;
  propertyTitle: string;
  requireGuarantor: "none" | "optional" | "required";
}

export default function TenantApplicationForm({
  propertyId,
  propertyTitle,
  requireGuarantor,
}: TenantApplicationFormProps) {
  // Personal Details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [situation, setSituation] = useState<"employee" | "student" | "other">("employee");
  const [income, setIncome] = useState("");
  const [comment, setComment] = useState("");

  // Guarantor Options
  const [hasGuarantor, setHasGuarantor] = useState(requireGuarantor === "required");
  const [guarantorType, setGuarantorType] = useState<"visale" | "physical">("visale");
  const [guarantorIncome, setGuarantorIncome] = useState("");

  // Files
  const [files, setFiles] = useState<Record<string, File | null>>({
    tenant_cni: null,
    tenant_payslips: null,
    tenant_school_cert: null,
    tenant_tax_notice: null,
    tenant_rent_receipts: null,
    guarantor_visale: null,
    guarantor_cni: null,
    guarantor_payslips: null,
    guarantor_tax_notice: null,
    guarantor_address_proof: null,
    guarantor_letter: null,
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (key: string, file: File | null) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const isGuarantorActive = requireGuarantor === "required" || (requireGuarantor === "optional" && hasGuarantor);

    // Build Form Data
    const formData = new FormData();
    formData.append("property_id", propertyId);
    formData.append("tenant_first_name", firstName);
    formData.append("tenant_last_name", lastName);
    formData.append("tenant_email", email);
    formData.append("tenant_phone", phone);
    formData.append("tenant_situation", situation);
    formData.append("tenant_income", income);
    formData.append("guarantor_type", isGuarantorActive ? guarantorType : "none");
    formData.append("guarantor_income", isGuarantorActive && guarantorType === "physical" ? guarantorIncome : "0");
    formData.append("tenant_comment", comment);

    // Append Files (if provided)
    if (files.tenant_cni) {
      formData.append("tenant_cni", files.tenant_cni);
    }
    if (situation === "employee" && files.tenant_payslips) {
      formData.append("tenant_payslips", files.tenant_payslips);
    }
    if (situation === "student" && files.tenant_school_cert) {
      formData.append("tenant_school_cert", files.tenant_school_cert);
    }
    if (files.tenant_tax_notice) {
      formData.append("tenant_tax_notice", files.tenant_tax_notice);
    }
    if (files.tenant_rent_receipts) {
      formData.append("tenant_rent_receipts", files.tenant_rent_receipts);
    }

    if (isGuarantorActive) {
      if (guarantorType === "visale" && files.guarantor_visale) {
        formData.append("guarantor_visale", files.guarantor_visale);
      } else if (guarantorType === "physical") {
        if (files.guarantor_cni) formData.append("guarantor_cni", files.guarantor_cni);
        if (files.guarantor_payslips) formData.append("guarantor_payslips", files.guarantor_payslips);
        if (files.guarantor_tax_notice) formData.append("guarantor_tax_notice", files.guarantor_tax_notice);
        if (files.guarantor_address_proof) formData.append("guarantor_address_proof", files.guarantor_address_proof);
        if (files.guarantor_letter) formData.append("guarantor_letter", files.guarantor_letter);
      }
    }

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        body: formData,
      });

      const resData = await response.json();

      if (!response.ok) {
        setError(resData.error || "Une erreur est survenue lors de l'envoi du dossier.");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setSubmitted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setError("Erreur réseau. Veuillez vérifier votre connexion.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={`${styles.card} animate-fade-in`} style={{ textAlign: "center", padding: "3rem 2rem" }}>
        <CheckCircle size={56} style={{ color: "var(--success)", marginBottom: "1.5rem" }} />
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>Dossier envoyé avec succès !</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
          Merci pour votre candidature. Votre dossier complet et ses pièces justificatives ont été transmis de manière sécurisée au propriétaire de <strong>{propertyTitle}</strong>.
        </p>
        <div style={{
          backgroundColor: "var(--bg-primary)",
          borderRadius: "var(--radius-md)",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          maxWidth: "400px",
          margin: "0 auto 2rem auto",
          fontSize: "0.9rem"
        }}>
          <div>Candidat : <strong>{firstName} {lastName}</strong></div>
          <div>E-mail : <strong>{email}</strong></div>
          <div>Situation : <strong>{situation === "employee" ? "Salarié" : situation === "student" ? "Étudiant" : "Autre"}</strong></div>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
          Vous pouvez maintenant fermer cette fenêtre.
        </p>
      </div>
    );
  }

  return (
    <div className={`${styles.card} animate-fade-in`} style={{ padding: "2.5rem" }}>
      {error && (
        <div style={{
          backgroundColor: "var(--error-light)",
          color: "var(--error)",
          padding: "0.75rem 1rem",
          borderRadius: "var(--radius-md)",
          fontSize: "0.875rem",
          marginBottom: "1.5rem",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.5rem"
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "0.1rem" }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* SECTION 1: Personal Details */}
        <fieldset style={{ border: "none", marginBottom: "2.5rem" }}>
          <legend style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)" }}>
            <User size={20} />
            1. Informations Personnelles
          </legend>

          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="first_name">Prénom *</label>
              <input
                id="first_name"
                type="text"
                required
                className={styles.input}
                placeholder="ex: Jean"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="last_name">Nom *</label>
              <input
                id="last_name"
                type="text"
                required
                className={styles.input}
                placeholder="ex: Dupont"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="email">Adresse E-mail *</label>
              <div style={{ position: "relative" }}>
                <Mail size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  id="email"
                  type="email"
                  required
                  className={styles.input}
                  style={{ paddingLeft: "2.5rem" }}
                  placeholder="jean.dupont@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="phone">Numéro de téléphone *</label>
              <div style={{ position: "relative" }}>
                <Phone size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  id="phone"
                  type="tel"
                  required
                  className={styles.input}
                  style={{ paddingLeft: "2.5rem" }}
                  placeholder="ex: 06 12 34 56 78"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </fieldset>

        {/* SECTION 2: Income and Situation */}
        <fieldset style={{ border: "none", marginBottom: "2.5rem" }}>
          <legend style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)" }}>
            <Briefcase size={20} />
            2. Situation Professionnelle et Revenus
          </legend>

          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="situation">Situation actuelle *</label>
              <select
                id="situation"
                className={styles.select}
                value={situation}
                onChange={(e) => setSituation(e.target.value as any)}
                disabled={loading}
              >
                <option value="employee">Salarié / Employé</option>
                <option value="student">Étudiant</option>
                <option value="other">Autre (Indépendant, Retraité, etc.)</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="income">Revenus nets mensuels (€) *</label>
              <input
                id="income"
                type="number"
                required
                min="0"
                className={styles.input}
                placeholder="ex: 1800"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        </fieldset>

        {/* SECTION 3: Supporting Documents */}
        <fieldset style={{ border: "none", marginBottom: "2.5rem" }}>
          <legend style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)" }}>
            <FileUp size={20} />
            3. Pièces Justificatives (Locataire)
          </legend>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* CNI */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Pièce d'identité (CNI / Passeport / Titre de séjour)</label>
              <FileInput
                id="tenant_cni"
                file={files.tenant_cni}
                onChange={(f) => handleFileChange("tenant_cni", f)}
                disabled={loading}
              />
            </div>

            {/* Payslips - Salary only */}
            {situation === "employee" && (
              <div className={styles.formGroup}>
                <label className={styles.label}>3 dernières fiches de paie (en 1 seul fichier)</label>
                <FileInput
                  id="tenant_payslips"
                  file={files.tenant_payslips}
                  onChange={(f) => handleFileChange("tenant_payslips", f)}
                  disabled={loading}
                />
              </div>
            )}

            {/* Student Cert - Student only */}
            {situation === "student" && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Certificat de scolarité ou Carte d'étudiant</label>
                <FileInput
                  id="tenant_school_cert"
                  file={files.tenant_school_cert}
                  onChange={(f) => handleFileChange("tenant_school_cert", f)}
                  disabled={loading}
                />
              </div>
            )}

            {/* Tax Notice */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Dernier avis d'imposition</label>
              <FileInput
                id="tenant_tax_notice"
                file={files.tenant_tax_notice}
                onChange={(f) => handleFileChange("tenant_tax_notice", f)}
                disabled={loading}
              />
            </div>

            {/* Rent Receipts */}
            <div className={styles.formGroup}>
              <label className={styles.label}>3 dernières quittances de loyer (ou attestation d'hébergement)</label>
              <FileInput
                id="tenant_rent_receipts"
                file={files.tenant_rent_receipts}
                onChange={(f) => handleFileChange("tenant_rent_receipts", f)}
                disabled={loading}
              />
            </div>
          </div>
        </fieldset>

        {/* SECTION 4: Guarantor (Conditional) */}
        {requireGuarantor !== "none" && (
          <fieldset style={{ border: "none", marginBottom: "3rem" }}>
            <legend style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)" }}>
              <UserCheck size={20} />
              4. Informations du Garant
            </legend>

            {requireGuarantor === "optional" && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
                <input
                  id="has_guarantor"
                  type="checkbox"
                  checked={hasGuarantor}
                  onChange={(e) => setHasGuarantor(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "var(--primary)" }}
                  disabled={loading}
                />
                <label htmlFor="has_guarantor" style={{ fontSize: "0.95rem", fontWeight: 500, cursor: "pointer" }}>
                  Je possède un garant (recommandé)
                </label>
              </div>
            )}

            {hasGuarantor && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }} className="animate-fade-in">
                <div className={styles.formGroup}>
                  <label className={styles.label}>Type de Garant *</label>
                  <div style={{ display: "flex", gap: "1.5rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="guarantor_type"
                        checked={guarantorType === "visale"}
                        onChange={() => setGuarantorType("visale")}
                        style={{ accentColor: "var(--primary)" }}
                        disabled={loading}
                      />
                      Garantie Visale (Action Logement)
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="guarantor_type"
                        checked={guarantorType === "physical"}
                        onChange={() => setGuarantorType("physical")}
                        style={{ accentColor: "var(--primary)" }}
                        disabled={loading}
                      />
                      Garant physique (Parent, proche)
                    </label>
                  </div>
                </div>

                {guarantorType === "visale" ? (
                  <div className={`${styles.formGroup} animate-fade-in`}>
                    <label className={styles.label}>Visa de garantie Visale en cours de validité</label>
                    <FileInput
                      id="guarantor_visale"
                      file={files.guarantor_visale}
                      onChange={(f) => handleFileChange("guarantor_visale", f)}
                      disabled={loading}
                    />
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }} className="animate-fade-in">
                    <div className={styles.formGroup}>
                      <label className={styles.label} htmlFor="guarantor_income">Revenus nets mensuels du garant (€) *</label>
                      <input
                        id="guarantor_income"
                        type="number"
                        required
                        min="0"
                        placeholder="ex: 2500"
                        className={styles.input}
                        value={guarantorIncome}
                        onChange={(e) => setGuarantorIncome(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Pièce d'identité du garant (CNI / Passeport)</label>
                      <FileInput
                        id="guarantor_cni"
                        file={files.guarantor_cni}
                        onChange={(f) => handleFileChange("guarantor_cni", f)}
                        disabled={loading}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>3 dernières fiches de paie du garant (en 1 seul fichier)</label>
                      <FileInput
                        id="guarantor_payslips"
                        file={files.guarantor_payslips}
                        onChange={(f) => handleFileChange("guarantor_payslips", f)}
                        disabled={loading}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Dernier avis d'imposition du garant</label>
                      <FileInput
                        id="guarantor_tax_notice"
                        file={files.guarantor_tax_notice}
                        onChange={(f) => handleFileChange("guarantor_tax_notice", f)}
                        disabled={loading}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Justificatif de domicile du garant (facture EDF, etc.)</label>
                      <FileInput
                        id="guarantor_address_proof"
                        file={files.guarantor_address_proof}
                        onChange={(f) => handleFileChange("guarantor_address_proof", f)}
                        disabled={loading}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Lettre d'engagement de caution solidaire signée</label>
                      <FileInput
                        id="guarantor_letter"
                        file={files.guarantor_letter}
                        onChange={(f) => handleFileChange("guarantor_letter", f)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </fieldset>
        )}

        {/* SECTION 5: Optional Comments */}
        <fieldset style={{ border: "none", marginBottom: "2.5rem" }}>
          <legend style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)" }}>
            <MessageSquare size={20} />
            5. Message ou remarques particulières (optionnel)
          </legend>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="comment">Votre message ou précisions pour le propriétaire</label>
            <textarea
              id="comment"
              className={styles.textarea}
              style={{ minHeight: "120px", resize: "vertical", padding: "0.75rem 1rem" }}
              placeholder="Ex: Précisions sur votre dossier, garant supplémentaire, date d'emménagement souhaitée..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={loading}
            />
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={loading}
          className={`${styles.btn} ${styles.btnPrimary}`}
          style={{ width: "100%", height: "50px" }}
        >
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div className={styles.spinner}></div>
              <span>Traitement et téléversement en cours...</span>
            </div>
          ) : (
            "Déposer ma candidature de location"
          )}
        </button>
      </form>
    </div>
  );
}

// Custom internal FileInput component for elegant file selection
interface FileInputProps {
  id: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

function FileInput({ id, file, onChange, disabled }: FileInputProps) {
  return (
    <div style={{
      border: "2px dashed var(--border-color)",
      borderRadius: "var(--radius-md)",
      padding: "1rem",
      backgroundColor: "var(--bg-primary)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "1rem",
      flexWrap: "wrap",
      transition: "border-color var(--transition-fast)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: "150px" }}>
        <FileUp size={20} style={{ color: file ? "var(--success)" : "var(--text-muted)", flexShrink: 0 }} />
        <span style={{ 
          fontSize: "0.875rem", 
          color: file ? "var(--text-primary)" : "var(--text-muted)",
          textOverflow: "ellipsis", 
          overflow: "hidden", 
          whiteSpace: "nowrap",
          maxWidth: "300px",
          fontWeight: file ? 600 : 400
        }}>
          {file ? file.name : "Aucun fichier sélectionné (PDF, JPG, PNG)"}
        </span>
      </div>

      <label
        htmlFor={id}
        className={`${styles.btn} ${styles.btnSecondary}`}
        style={{
          padding: "0.5rem 1rem",
          fontSize: "0.8rem",
          cursor: disabled ? "not-allowed" : "pointer",
          margin: 0
        }}
      >
        <span>{file ? "Modifier" : "Choisir un fichier"}</span>
        <input
          id={id}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          disabled={disabled}
          onChange={(e) => {
            const selectedFile = e.target.files?.[0] || null;
            onChange(selectedFile);
          }}
          style={{ display: "none" }}
        />
      </label>
    </div>
  );
}
