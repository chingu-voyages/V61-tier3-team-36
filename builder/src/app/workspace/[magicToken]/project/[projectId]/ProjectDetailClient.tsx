"use client";

/**
 * @file ProjectDetailClient.tsx
 * @description Composed project workspace page that manages the interactive specification interview,
 * progress checklists, client-side API Key Gate headers attachment, preformatted specification view,
 * side-by-side history panel, and specification file export (.md).
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./project.module.css";
import ApiKeyGate from "../../../../components/ApiKeyGate";
import { SPEC_SECTIONS, type SpecSection } from "../../../../../../lib/spec-sections";

import type { ConversationMessage } from "../../../../../../lib/conversation";
import type { InterviewState } from "../../../../../../lib/interview-state";

interface Spec {
  id: string;
  project_id: string;
  markdown: string;
  schema_json: any;
  version: number;
  created_at: string;
}

interface ProjectDetailClientProps {
  magicToken: string;
  projectId: string;
  projectName: string;
  initialConversation: {
    messages: ConversationMessage[];
    interview_state: InterviewState;
  };
  initialSpec: Spec | null;
}

interface DisplayMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
}

// Custom Markdown parser for premium Spec presentation
function parseMarkdown(md: string): string {
  if (!md) return "";
  
  // Escape HTML to prevent XSS
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Headers
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Bullet Lists (simple replacement)
  const lines = html.split("\n");
  let inList = false;
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      let content = trimmed.substring(2);
      let prefix = "";
      if (!inList) {
        inList = true;
        prefix = "<ul>";
      }
      return prefix + `<li>${content}</li>`;
    } else {
      let suffix = "";
      if (inList) {
        inList = false;
        suffix = "</ul>";
      }
      return suffix + line;
    }
  });
  
  if (inList) {
    processedLines.push("</ul>");
  }

  html = processedLines.join("\n");

  // Paragraphs
  html = html.split(/\n\n+/).map(p => {
    const trimmed = p.trim();
    if (trimmed.startsWith("<h") || trimmed.startsWith("<pre") || trimmed.startsWith("<ul") || trimmed.startsWith("<li")) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\n/g, "<br />")}</p>`;
  }).join("\n");

  return html;
}

export default function ProjectDetailClient({
  magicToken,
  projectId,
  projectName,
  initialConversation,
  initialSpec,
}: ProjectDetailClientProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>(
    initialConversation.messages
  );
  const [interviewState, setInterviewState] = useState<InterviewState>(
    initialConversation.interview_state
  );
  const [spec, setSpec] = useState<Spec | null>(initialSpec);

  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingSpec, setIsGeneratingSpec] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Convert raw message logs into clean chat display content
  const displayMessages = (() => {
    const display: DisplayMessage[] = [];
    messages.forEach((msg, idx) => {
      const id = `msg-${idx}`;
      if (msg.role === "user") {
        if (typeof msg.content === "string") {
          display.push({ id, sender: "user", text: msg.content });
        }
      } else if (msg.role === "assistant") {
        if (Array.isArray(msg.content)) {
          const toolUse = msg.content.find(
            (c: any) => c.type === "tool_use" && c.name === "update_interview"
          ) as any;
          if (toolUse?.input?.next_question) {
            display.push({
              id,
              sender: "assistant",
              text: toolUse.input.next_question,
            });
          }
        } else if (typeof msg.content === "string") {
          display.push({ id, sender: "assistant", text: msg.content });
        }
      }
    });
    return display;
  })();

  /**
   * Optimistically posts the user's message, locks the input interface,
   * transmits the text along with X-Anthropic-Api-Key headers to the chat API,
   * and updates conversation messages and checklist states.
   */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() === "" || isSending) return;

    const messageToSend = inputText.trim();
    setInputText("");
    setIsSending(true);
    setError(null);

    // Optimistically add user message to the UI
    setMessages((prev) => [
      ...prev,
      { role: "user", content: messageToSend },
    ]);

    const provider = localStorage.getItem("specforge_api_provider") || "anthropic";
    const userApiKey = localStorage.getItem(
      provider === "openai" ? "specforge_openai_key" : "specforge_anthropic_key"
    ) || "";

    try {
      const response = await fetch(
        `/api/projects/${projectId}/conversation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Workspace-Token": magicToken,
            "X-Api-Provider": provider,
            ...(provider === "openai"
              ? { "X-OpenAI-Api-Key": userApiKey }
              : { "X-Anthropic-Api-Key": userApiKey }),
          },
          body: JSON.stringify({ message: messageToSend }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process message");
      }

      setMessages(data.messages);
      setInterviewState(data.state);
    } catch (err: any) {
      setError(err.message || "Something went wrong sending your message.");
      // Rollback optimistic update on failure by refetching conversation
      await refetchConversation();
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Refetches the full conversation list and checklist status from the database,
   * typically used to rollback optimistic UI renders in case of upstream API failure.
   */
  const refetchConversation = async () => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/conversation`,
        {
          headers: {
            "X-Workspace-Token": magicToken,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        setInterviewState(data.interview_state);
      }
    } catch (err) {
      console.error("Failed to refetch conversation status", err);
    }
  };

  /**
   * Dispatches a POST request to compile the interview transcript into a structured spec document,
   * passing X-Anthropic-Api-Key headers, and saves the resulting spec in local state.
   */
  const handleGenerateSpec = async () => {
    setIsGeneratingSpec(true);
    setError(null);

    const provider = localStorage.getItem("specforge_api_provider") || "anthropic";
    const userApiKey = localStorage.getItem(
      provider === "openai" ? "specforge_openai_key" : "specforge_anthropic_key"
    ) || "";

    try {
      const response = await fetch(`/api/projects/${projectId}/spec`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Token": magicToken,
          "X-Api-Provider": provider,
          ...(provider === "openai"
            ? { "X-OpenAI-Api-Key": userApiKey }
            : { "X-Anthropic-Api-Key": userApiKey }),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate specification");
      }

      setSpec(data);
    } catch (err: any) {
      setError(err.message || "Failed to compile the specification document.");
    } finally {
      setIsGeneratingSpec(false);
    }
  };

  /**
   * Creates a text/markdown file Blob locally in the browser and triggers
   * a download named specification-v{version}.md containing the spec markdown text.
   */
  const handleDownloadSpec = () => {
    if (!spec) return;
    const blob = new Blob([spec.markdown], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `specification-v${spec.version}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute satisfied sections percentage
  const satisfiedCount = interviewState.satisfiedSectionIds.length;
  const progressPercent = Math.round((satisfiedCount / SPEC_SECTIONS.length) * 100);
  const isConverged = satisfiedCount === SPEC_SECTIONS.length;

  return (
    <ApiKeyGate>
      <div className={styles.container}>
      <nav className={styles.breadcrumb}>
        <Link href={`/workspace/${magicToken}`}>← Back to Workspace Dashboard</Link>
      </nav>

      <header className={styles.projectHeader}>
        <div className={styles.titleArea}>
          <h1 className={styles.projectName}>{projectName}</h1>
          <span className={styles.workspaceBadge}>Project ID: {projectId}</span>
        </div>
      </header>

      <div className={styles.workspaceLayout}>
        {/* Sidebar: Interview Progress Tracker */}
        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>Spec Progress</h2>
          
          <div className={styles.progressBarContainer}>
            <div className={styles.progressLabel}>
              <span>Sections Completed</span>
              <span>{progressPercent}%</span>
            </div>
            <div className={styles.progressBarBg}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className={styles.sectionList}>
            {SPEC_SECTIONS.map((section: SpecSection) => {
              const isSatisfied = interviewState.satisfiedSectionIds.includes(
                section.id
              );
              return (
                <div
                  key={section.id}
                  className={`${styles.sectionItem} ${
                    isSatisfied
                      ? styles.sectionItemSatisfied
                      : styles.sectionItemPending
                  }`}
                >
                  <div className={styles.checkboxIcon}>
                    {isSatisfied ? "✓" : ""}
                  </div>
                  <div className={styles.sectionItemDetails}>
                    <span className={styles.sectionLabel}>{section.label}</span>
                    <span className={styles.sectionDesc}>
                      {section.description}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main Section: Interview Chat & Final Spec */}
        <main className={styles.mainArea}>
          {error && (
            <div className={styles.errorBox} style={{ marginBottom: "1.5rem" }}>
              <span className={styles.errorTitle}>Error Processing Request</span>
              <p>{error}</p>
            </div>
          )}

          {/* Spec Document View - Rendered once generated */}
          {spec ? (
            <div className={styles.workspaceSplitGrid}>
              <div className={`${styles.card} ${styles.specContainer} animate-fade-in`}>
                <div className={styles.specHeader}>
                  <h2 className={styles.specTitle}>Specification Document</h2>
                  <span className={styles.specVersionBadge}>
                    Version {spec.version}
                  </span>
                </div>
                
                {/* v1 renders Markdown as preformatted text */}
                <pre className={styles.specPre}>{spec.markdown}</pre>

                <div className={styles.specActions}>
                  <button
                    onClick={handleDownloadSpec}
                    className={styles.downloadBtn}
                    title="Download spec as .md file"
                  >
                    <span className={styles.downloadIcon}>📥</span>
                    Download as Markdown (.md)
                  </button>

                  {isConverged && (
                    <button
                      onClick={handleGenerateSpec}
                      disabled={isGeneratingSpec}
                      className={styles.generateBtn}
                      style={{ marginTop: 0 }}
                    >
                      {isGeneratingSpec ? "Regenerating..." : "Regenerate Spec Document"}
                    </button>
                  )}
                </div>
              </div>

              {/* View-only chat transcript on the right */}
              <div className={`${styles.card} ${styles.chatPane} ${styles.chatPaneCompact}`}>
                <div className={styles.chatMessagesCompactHeader}>
                  <h3>Interview History</h3>
                </div>
                <div className={styles.chatMessages}>
                  {displayMessages.length === 0 && !isSending ? (
                    <div className={styles.welcomeBubble}>
                      <h3 className={styles.welcomeTitle}>
                        Let's design your product spec!
                      </h3>
                    </div>
                  ) : (
                    displayMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`${styles.messageRow} ${
                          msg.sender === "user"
                            ? styles.messageRowUser
                            : styles.messageRowAssistant
                        }`}
                      >
                        <div
                          className={`${styles.messageBubble} ${
                            msg.sender === "user"
                              ? styles.messageBubbleUser
                              : styles.messageBubbleAssistant
                          }`}
                          style={{ fontSize: "0.85rem", padding: "0.6rem 0.85rem" }}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>
          ) : (
            <div className={`${styles.card} ${styles.chatPane}`}>
              <div className={styles.chatMessages}>
                {displayMessages.length === 0 && !isSending ? (
                  <div className={styles.welcomeBubble}>
                    <h3 className={styles.welcomeTitle}>
                      Let's design your product spec!
                    </h3>
                    <p className={styles.welcomeText}>
                      Describe your product idea to Claude below. Explain the core features, 
                      who will use it, and what problem it solves. Claude will guide you 
                      through the rest.
                    </p>
                  </div>
                ) : (
                  displayMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`${styles.messageRow} ${
                        msg.sender === "user"
                          ? styles.messageRowUser
                          : styles.messageRowAssistant
                      }`}
                    >
                      <div
                        className={`${styles.messageBubble} ${
                          msg.sender === "user"
                            ? styles.messageBubbleUser
                            : styles.messageBubbleAssistant
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}

                {isSending && (
                  <div className={`${styles.messageRow} ${styles.messageRowAssistant}`}>
                    <div className={styles.thinkingBubble}>
                      <span className={styles.spinner} />
                      <span>Claude is writing...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Interface */}
              {!isConverged ? (
                <form className={styles.chatInputForm} onSubmit={handleSendMessage}>
                  <textarea
                    className={styles.chatInput}
                    placeholder="Type your response here..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    disabled={isSending}
                    rows={1}
                    required
                  />
                  <button
                    type="submit"
                    className={styles.sendBtn}
                    disabled={isSending || inputText.trim() === ""}
                  >
                    Send
                  </button>
                </form>
              ) : (
                <div className={styles.generateBox}>
                  <span className={styles.generateIcon}>🎉</span>
                  <h3 className={styles.generateTitle}>Interview Complete!</h3>
                  <p className={styles.generateDesc}>
                    All spec sections have been fully satisfied. You are ready to generate 
                    the formal specification document.
                  </p>
                  <button
                    onClick={handleGenerateSpec}
                    disabled={isGeneratingSpec}
                    className={styles.generateBtn}
                  >
                    {isGeneratingSpec ? "Compiling..." : "Generate Spec Document"}
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  </ApiKeyGate>
  );
}
