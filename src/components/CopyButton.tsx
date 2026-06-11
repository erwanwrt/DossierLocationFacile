"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import styles from "@/styles/components.module.css";

interface CopyButtonProps {
  text: string;
}

export default function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`${styles.btn} ${styles.btnSecondary}`}
      style={{ padding: "0.5rem", borderRadius: "var(--radius-sm)", display: "flex", gap: "0.25rem", alignItems: "center" }}
      title="Copier le lien de candidature"
    >
      {copied ? (
        <>
          <Check size={14} style={{ color: "var(--success)" }} />
          <span style={{ fontSize: "0.75rem", color: "var(--success)", fontWeight: 500 }}>Copié !</span>
        </>
      ) : (
        <>
          <Copy size={14} />
          <span style={{ fontSize: "0.75rem" }}>Lien</span>
        </>
      )}
    </button>
  );
}
