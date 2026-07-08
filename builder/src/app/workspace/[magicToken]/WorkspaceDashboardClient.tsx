"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./workspace.module.css";
import ApiKeyGate from "../../components/ApiKeyGate";

interface Project {
  id: string;
  name: string;
  status: string;
  created_at: Date;
}

interface WorkspaceDashboardClientProps {
  magicToken: string;
  initialProjects: Project[];
}

export default function WorkspaceDashboardClient({
  magicToken,
  initialProjects,
}: WorkspaceDashboardClientProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [projectName, setProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (projectName.trim() === "") return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Token": magicToken,
        },
        body: JSON.stringify({ name: projectName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      setProjects([data, ...projects]);
      setProjectName("");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <ApiKeyGate>
      <div className={`${styles.container} animate-fade-in`}>
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <h1 className={styles.title}>SpecForge</h1>
            <div className={styles.tokenBadge} title="Workspace Key">
              🔑 Token: {magicToken.substring(0, 8)}...
            </div>
          </div>
          <p className={styles.subtitle}>
            Turn your product concepts into clear, structured, and review-ready specifications.
          </p>
        </header>

        {/* Bookmark Warning banner */}
        <section className={styles.bookmarkAlert}>
          <span className={styles.bookmarkIcon}>💡</span>
          <div className={styles.bookmarkText}>
            <h3 className={styles.bookmarkTitle}>Save this URL to access your workspace later!</h3>
            <p className={styles.bookmarkDesc}>
              This URL contains your unique workspace magic token. Since SpecForge does not use standard accounts, 
              <strong> bookmark this page </strong> to return to your projects: 
              <code>/workspace/{magicToken}</code>
            </p>
          </div>
        </section>

        <main className={styles.mainGrid}>
          <section className={styles.projectsSection}>
            <h2 className={styles.sectionTitle}>Your Projects ({projects.length})</h2>
            
            {projects.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>📁</div>
                <h3>No projects found</h3>
                <p>Create a new project on the right to start building your specification.</p>
              </div>
            ) : (
              <div className={styles.projectList}>
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/workspace/${magicToken}/project/${project.id}`}
                    className={styles.projectCard}
                  >
                    <div className={styles.projectInfo}>
                      <h3 className={styles.projectName}>{project.name}</h3>
                      <div className={styles.projectMeta}>
                        <span className={styles.statusIndicator}>
                          <span className={styles.statusDot} />
                          Active
                        </span>
                        <span>Created {formatDate(project.created_at)}</span>
                      </div>
                    </div>
                    <div className={styles.arrowIcon}>→</div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className={styles.creationSection}>
            <h2 className={styles.sectionTitle}>New Project</h2>
            <form className={styles.createForm} onSubmit={handleCreateProject}>
              <div className={styles.formGroup}>
                <label htmlFor="projectName" className={styles.formLabel}>
                  Project Name
                </label>
                <input
                  id="projectName"
                  type="text"
                  placeholder="e.g., Recipe Sharing App"
                  className={styles.formInput}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  disabled={isSubmitting}
                  maxLength={100}
                  required
                />
                {error && <p className={styles.errorText}>{error}</p>}
              </div>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting || projectName.trim() === ""}
              >
                {isSubmitting ? "Creating..." : "Create Project"}
              </button>
            </form>
          </section>
        </main>
      </div>
    </ApiKeyGate>
  );
}
