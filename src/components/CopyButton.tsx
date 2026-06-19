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
      style={{
        padding: "0.5rem",
        borderRadius: "var(--radius-sm)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      title="Copier le lien de candidature"
    >
      {copied ? (
        <Check size={16} style={{ color: "var(--success)" }} />
      ) : (
        <Copy size={16} />
      )}
    </button>
  );
}
