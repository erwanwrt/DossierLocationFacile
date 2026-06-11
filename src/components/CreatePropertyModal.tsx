"use client";

import { useState } from "react";
import { createProperty } from "@/app/actions";
import styles from "@/styles/components.module.css";
import { Plus, X, Building, MapPin, AlignLeft, ShieldCheck } from "lucide-react";

export default function CreatePropertyModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [requireGuarantor, setRequireGuarantor] = useState<"none" | "optional" | "required">("optional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await createProperty({
        title,
        address,
        description,
        require_guarantor: requireGuarantor,
      });

      if (res.error) {
        setError(res.error);
      } else {
        // Reset and close
        setTitle("");
        setAddress("");
        setDescription("");
        setRequireGuarantor("optional");
        setIsOpen(false);
      }
    } catch (err) {
      setError("Une erreur est survenue lors de la création.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`${styles.btn} ${styles.btnPrimary}`}
        style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
      >
        <Plus size={18} />
        <span>Ajouter un bien</span>
      </button>

      {isOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1rem"
        }}>
          <div 
            className={`${styles.card} animate-fade-in`} 
            style={{ 
              maxWidth: "550px", 
              width: "100%", 
              maxHeight: "90vh", 
              overflowY: "auto",
              position: "relative" 
            }}
          >
            <button
              onClick={() => setIsOpen(false)}
              className={styles.btnSecondary}
              style={{
                position: "absolute",
                top: "1.5rem",
                right: "1.5rem",
                padding: "0.4rem",
                borderRadius: "50%",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <X size={18} />
            </button>

            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Building size={22} style={{ color: "var(--primary)" }} />
              Ajouter une nouvelle propriété
            </h2>

            {error && (
              <div style={{
                backgroundColor: "var(--error-light)",
                color: "var(--error)",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.875rem",
                marginBottom: "1.5rem",
                border: "1px solid rgba(239, 68, 68, 0.2)"
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="modal-title">
                  Nom du bien / Titre *
                </label>
                <div style={{ position: "relative" }}>
                  <Building size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    id="modal-title"
                    type="text"
                    required
                    placeholder="ex: Appartement T2 - Centre Ville"
                    className={styles.input}
                    style={{ paddingLeft: "2.75rem" }}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="modal-address">
                  Adresse complète *
                </label>
                <div style={{ position: "relative" }}>
                  <MapPin size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    id="modal-address"
                    type="text"
                    required
                    placeholder="ex: 12 Rue de la République, 75001 Paris"
                    className={styles.input}
                    style={{ paddingLeft: "2.75rem" }}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="modal-description">
                  Description / Notes
                </label>
                <div style={{ position: "relative" }}>
                  <AlignLeft size={16} style={{ position: "absolute", left: "1rem", top: "1rem", color: "var(--text-muted)" }} />
                  <textarea
                    id="modal-description"
                    rows={3}
                    placeholder="ex: Proche de la gare, rénové en 2025..."
                    className={styles.textarea}
                    style={{ paddingLeft: "2.75rem" }}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.formGroup} style={{ marginBottom: "2rem" }}>
                <label className={styles.label} htmlFor="modal-guarantor">
                  Exigence du Garant
                </label>
                <div style={{ position: "relative" }}>
                  <ShieldCheck size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <select
                    id="modal-guarantor"
                    className={styles.select}
                    style={{ paddingLeft: "2.75rem" }}
                    value={requireGuarantor}
                    onChange={(e) => setRequireGuarantor(e.target.value as any)}
                    disabled={loading}
                  >
                    <option value="none">Pas de garant requis</option>
                    <option value="optional">Garant optionnel (conseillé)</option>
                    <option value="required">Garant obligatoire</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={loading}
                >
                  {loading ? <div className={styles.spinner}></div> : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
