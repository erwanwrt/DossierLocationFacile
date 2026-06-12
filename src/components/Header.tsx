"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "@/styles/components.module.css";
import { LogOut, User, Settings } from "lucide-react";

interface HeaderProps {
  userName: string;
}

export default function Header({ userName }: HeaderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/login");
            router.refresh();
          },
        },
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className={styles.navbar}>
      <div className={styles.logo}>
        <img src="/logo.png" alt="Logo" width={30} height={30} />
        <span>Dossier Location Facile</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            backgroundColor: "var(--primary-light)",
            color: "var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 600,
            fontSize: "0.875rem"
          }}>
            {userName ? userName[0].toUpperCase() : "A"}
          </div>
          <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--text-secondary)" }}>
            {userName}
          </span>
        </div>

        <button
          onClick={handleLogout}
          disabled={loading}
          className={`${styles.btn} ${styles.btnSecondary}`}
          style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          {loading ? <div className={styles.spinner} style={{ borderColor: "rgba(0,0,0,0.1)", borderTopColor: "var(--primary)" }}></div> : <LogOut size={16} />}
          <span>Déconnexion</span>
        </button>
      </div>
    </header>
  );
}
