"use client";

import { useState } from "react";
import { updateSubmissionStatus } from "@/app/actions";
import { Check, X, Loader2 } from "lucide-react";
import styles from "@/styles/components.module.css";

interface SubmissionStatusActionsProps {
  submissionId: string;
  currentStatus: "pending" | "accepted" | "rejected";
}

export default function SubmissionStatusActions({ submissionId, currentStatus }: SubmissionStatusActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleStatusUpdate = async (newStatus: "accepted" | "rejected") => {
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

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      {loading ? (
        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          <Loader2 size={16} className={styles.spinnerPrimary} style={{ animation: "spin 1s linear infinite" }} />
          Mise à jour...
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
        </>
      )}
    </div>
  );
}
