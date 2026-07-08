"use client";

/**
 * @file ApiKeyGate.tsx
 * @description Layout wrapper component that gates application access behind the presence of a user's
 * Anthropic API key stored in the browser's localStorage. Handles key persistence, validation,
 * and a developer bypass mechanism.
 */

import { useState, useEffect } from "react";
import styles from "./api-key.module.css";

interface ApiKeyGateProps {
  children: React.ReactNode;
}

export default function ApiKeyGate({ children }: ApiKeyGateProps) {
  const [key, setKey] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  useEffect(() => {
    const storedKey = localStorage.getItem("specforge_anthropic_key");
    if (storedKey && storedKey.trim() !== "") {
      setIsAuthenticated(true);
      setKey(storedKey);
    }
    setMounted(true);
  }, []);

  /**
   * Validates and saves the client's Anthropic API Key in browser localStorage.
   * If validation succeeds, sets authenticated state and closes settings overlay.
   */
  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (trimmed === "") {
      setError("API Key cannot be empty");
      return;
    }

    // Support 'env' for bypass in development (falls back to server .env)
    if (!trimmed.startsWith("sk-ant-") && trimmed !== "env") {
      setError("Invalid Anthropic key format. Should start with 'sk-ant-' (or enter 'env' to use server-configured key)");
      return;
    }

    localStorage.setItem("specforge_anthropic_key", trimmed);
    setIsAuthenticated(true);
    setError(null);
    setShowSettings(false);
  };

  // Prevent SSR hydration mismatch by waiting until client-side mount
  if (!mounted) {
    return <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-base)" }} />;
  }

  if (!isAuthenticated || showSettings) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <div className={styles.icon}>🔑</div>
            <h1 className={styles.title}>API Key Required</h1>
            <p className={styles.description}>
              To start designing specifications and chatting with the AI, please enter your Anthropic API Key.
            </p>
          </div>

          <div className={styles.securityNotice}>
            <span className={styles.securityIcon}>🔒</span>
            <div className={styles.securityText}>
              <strong>Privacy &amp; Security:</strong> Your key is stored strictly locally in your browser (<code>localStorage</code>) and is sent directly in request headers to our server proxy. It is never transmitted or shared with any third party.
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSaveKey}>
            <div className={styles.formGroup}>
              <label htmlFor="apiKey" className={styles.label}>
                Anthropic API Key
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="apiKey"
                  type="password"
                  placeholder="sk-ant-..."
                  className={styles.input}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  required
                />
              </div>
              {error && <p className={styles.errorText}>{error}</p>}
            </div>
            
            <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
              <button type="submit" className={styles.submitBtn} style={{ flex: 1 }}>
                Save &amp; Continue
              </button>
              {isAuthenticated && (
                <button
                  type="button"
                  className={styles.submitBtn}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-secondary)",
                    flex: 1,
                  }}
                  onClick={() => setShowSettings(false)}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      {/* Floating settings gear to clear/update key */}
      <div className={styles.settingsWidget}>
        <span className={styles.settingsTooltip}>Change API Key</span>
        <button
          onClick={() => setShowSettings(true)}
          className={styles.settingsBtn}
          title="Change Anthropic API Key"
          aria-label="Change Anthropic API Key"
        >
          ⚙️
        </button>
      </div>
    </>
  );
}
