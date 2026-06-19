"use client";

import { useState } from "react";
import { toggleFormActive } from "@/app/actions";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import styles from "@/styles/components.module.css";

interface ToggleFormStatusButtonProps {
  propertyId: string;
  isActive: boolean;
}

export default function ToggleFormStatusButton({ propertyId, isActive }: ToggleFormStatusButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await toggleFormActive(propertyId, !isActive);
      if (res?.error) {
        alert(res.error);
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de la modification de l'état du formulaire.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`${styles.btn} ${styles.btnSecondary}`}
      style={{
        padding: "0.5rem",
        borderRadius: "var(--radius-sm)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1,
      }}
      title={isActive ? "Désactiver le formulaire" : "Activer le formulaire"}
    >
      {loading ? (
        <Loader2 size={16} className={styles.spinnerPrimary} style={{ animation: "spin 1s linear infinite" }} />
      ) : isActive ? (
        <EyeOff size={16} />
      ) : (
        <Eye size={16} />
      )}
    </button>
  );
}
