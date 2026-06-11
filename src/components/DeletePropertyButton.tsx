"use client";

import { useState } from "react";
import { deleteProperty } from "@/app/actions";
import { Trash2 } from "lucide-react";
import styles from "@/styles/components.module.css";

interface DeletePropertyButtonProps {
  propertyId: string;
  propertyTitle: string;
}

export default function DeletePropertyButton({ propertyId, propertyTitle }: DeletePropertyButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    const confirmDelete = confirm(`Êtes-vous sûr de vouloir supprimer la propriété "${propertyTitle}" ? Cette action est irréversible et supprimera également tous les formulaires et dossiers associés.`);
    
    if (!confirmDelete) return;

    setLoading(true);
    try {
      const res = await deleteProperty(propertyId);
      if (res?.error) {
        alert(res.error);
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de la suppression.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className={`${styles.btn} ${styles.btnSecondary}`}
      style={{
        padding: "0.5rem",
        borderRadius: "var(--radius-sm)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--error)",
        borderColor: "rgba(239, 68, 68, 0.2)"
      }}
      title="Supprimer la propriété"
    >
      <Trash2 size={16} />
    </button>
  );
}
