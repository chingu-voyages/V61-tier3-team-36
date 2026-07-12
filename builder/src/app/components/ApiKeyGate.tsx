"use client";

/**
 * @file ApiKeyGate.tsx
 * @description Layout wrapper component that gates application access behind the presence of a user's
 * Anthropic, OpenAI, or Google Gemini API key stored in the browser's localStorage. Handles key persistence, validation,
 * and a developer bypass mechanism.
 */

import { useState, useEffect } from "react";
import styles from "./api-key.module.css";

type AIProvider = "anthropic" | "openai" | "gemini";

interface ProviderConfig {
  storageKey: string;
  label: string;
  placeholder: string;
  prefix: string;
  errorMessage: string;
}

/**
 * Centralized configuration for all supported AI providers.
 * This eliminates duplicated if/else chains for localStorage keys, labels, placeholders, and validation.
 */
const PROVIDER_CONFIG: Record<AIProvider, ProviderConfig> = {
  anthropic: {
    storageKey: "specforge_anthropic_key",
    label: "Anthropic API Key",
    placeholder: "sk-ant-...",
    prefix: "sk-ant-",
    errorMessage: "Invalid Anthropic key format. Should start with 'sk-ant-' (or enter 'env')",
  },
  openai: {
    storageKey: "specforge_openai_key",
    label: "OpenAI API Key",
    placeholder: "sk-...",
    prefix: "sk-",
    errorMessage: "Invalid OpenAI key format. Should start with 'sk-' (or enter 'env')",
  },
  gemini: {
    storageKey: "specforge_gemini_key",
    label: "Google Gemini API Key",
    placeholder: "AIza...",
    prefix: "AIza",
    errorMessage: "Invalid Gemini key format. Should start with 'AIza' (or enter 'env')",
  },
};

interface ApiKeyGateProps {
  children: React.ReactNode;
}

export default function ApiKeyGate({ children }: ApiKeyGateProps) {
  const [provider, setProvider] = useState<AIProvider>("anthropic");
  const [key, setKey] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  console.log("=== ApiKeyGate Render ===");
  console.log({
  mounted,
  isAuthenticated,
  showSettings,
  provider,
  key,
});

  useEffect(() => {
  console.log("ApiKeyGate useEffect");

  const storedProvider =
    (localStorage.getItem("specforge_api_provider") || "anthropic") as AIProvider;

  console.log("Stored provider:", storedProvider);

  const config = PROVIDER_CONFIG[storedProvider];
  console.log("Provider config:", config);

  const storedKey = localStorage.getItem(config.storageKey);
  console.log("Stored key:", storedKey);

  if (storedKey && storedKey.trim() !== "") {
    console.log("Setting authenticated");
    setIsAuthenticated(true);
    setKey(storedKey);
  }

  setProvider(storedProvider);
  setMounted(true);

  console.log("Mounted set to true");
}, []);

  /**
   * Validates and saves the client's API Key in browser localStorage.
   * If validation succeeds, sets authenticated state and closes settings overlay.
   */
  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (trimmed === "") {
      setError("API Key cannot be empty");
      return;
    }

    const config = PROVIDER_CONFIG[provider];

    // Support 'env' for bypass in development (falls back to server .env)
    if (!trimmed.startsWith(config.prefix) && trimmed !== "env") {
      setError(config.errorMessage);
      return;
    }

    localStorage.setItem(config.storageKey, trimmed);
    localStorage.setItem("specforge_api_provider", provider);
    
    setIsAuthenticated(true);
    setError(null);
    setShowSettings(false);
  };

  // Prevent SSR hydration mismatch by waiting until client-side mount
  console.log("Checking mounted:", mounted);
  if (!mounted) {
    return <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-base)" }} />;
  }
  
  console.log(JSON.stringify({
  isAuthenticated,
  showSettings,
}));

console.log(
  "Condition:",
  !isAuthenticated || showSettings
);

  if (!isAuthenticated || showSettings) {

    console.log("Rendering API Key Modal");
    const config = PROVIDER_CONFIG[provider];

    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <div className={styles.icon}>🔑</div>
            <h1 className={styles.title}>API Key Required</h1>
            <p className={styles.description}>
              To start designing specifications and chatting with the AI, please configure your AI provider and enter your API Key.
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
              <label htmlFor="apiProvider" className={styles.label}>
                AI Provider
              </label>
              <select
                id="apiProvider"
                className={styles.input}
                value={provider}
                style={{ cursor: "pointer" }}
                onChange={(e) => {
                  const val = e.target.value as AIProvider;
                  setProvider(val);
                  setError(null);
                  const storedVal = localStorage.getItem(PROVIDER_CONFIG[val].storageKey) || "";
                  setKey(storedVal);
                }}
              >
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI (GPT-4o)</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="apiKey" className={styles.label}>
                {config.label}
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="apiKey"
                  type="password"
                  placeholder={config.placeholder}
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
          title="Change API Key"
          aria-label="Change API Key"
        >
          ⚙️
        </button>
      </div>
    </>
  );
}