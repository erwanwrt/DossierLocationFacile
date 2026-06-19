"use client";

import { useState } from "react";
import { updateSubmissionStatus, deleteSubmission } from "@/app/actions";
import { Check, X, Loader2, Trash2 } from "lucide-react";
import styles from "@/styles/components.module.css";

interface SubmissionStatusActionsProps {
  submissionId: string;
  currentStatus: "pending" | "accepted" | "rejected";
}

export default function SubmissionStatusActions({ submissionId, currentStatus }: SubmissionStatusActionsProps) {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Mise à jour...");

  const handleStatusUpdate = async (newStatus: "accepted" | "rejected") => {
    setLoadingMessage("Mise à jour...");
    setLoading(true);
    try {
      const res = await updateSubmissionStatus(submissionId, newStatus);
      if (res?.error) {
        alert(res.error);
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de la mise à jour du dossier.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Êtes-vous sûr de vouloir supprimer cette candidature ? Cette action est irréversible et supprimera également tous les fichiers associés sur Google Drive."
    );
    if (!confirmed) return;

    setLoadingMessage("Suppression...");
    setLoading(true);
    try {
      const res = await deleteSubmission(submissionId);
      if (res?.error) {
        alert(res.error);
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de la suppression de la candidature.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      {loading ? (
        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          <Loader2 size={16} className={styles.spinnerPrimary} style={{ animation: "spin 1s linear infinite" }} />
          {loadingMessage}
        </span>
      ) : (
        <>
          <button
            onClick={() => handleStatusUpdate("accepted")}
            disabled={currentStatus === "accepted"}
            className={`${styles.btn} ${styles.btnOutline}`}
            style={{
              padding: "0.4rem 0.8rem",
              fontSize: "0.8rem",
              borderColor: "var(--success)",
              color: currentStatus === "accepted" ? "#ffffff" : "var(--success)",
              backgroundColor: currentStatus === "accepted" ? "var(--success)" : "transparent",
              cursor: currentStatus === "accepted" ? "default" : "pointer"
            }}
          >
            <Check size={14} />
            <span>Accepter</span>
          </button>

          <button
            onClick={() => handleStatusUpdate("rejected")}
            disabled={currentStatus === "rejected"}
            className={`${styles.btn} ${styles.btnOutline}`}
            style={{
              padding: "0.4rem 0.8rem",
              fontSize: "0.8rem",
              borderColor: "var(--error)",
              color: currentStatus === "rejected" ? "#ffffff" : "var(--error)",
              backgroundColor: currentStatus === "rejected" ? "var(--error)" : "transparent",
              cursor: currentStatus === "rejected" ? "default" : "pointer"
            }}
          >
            <X size={14} />
            <span>Refuser</span>
          </button>

          <button
            onClick={handleDelete}
            className={`${styles.btn} ${styles.btnOutline}`}
            style={{
              padding: "0.4rem 0.8rem",
              fontSize: "0.8rem",
              borderColor: "rgba(239, 68, 68, 0.2)",
              color: "var(--error)",
              backgroundColor: "transparent",
              cursor: "pointer"
            }}
          >
            <Trash2 size={14} />
            <span>Supprimer</span>
          </button>
        </>
      )}
    </div>
  );
}

