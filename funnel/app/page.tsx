"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  { id: 1, label: "Scraping social media", icon: "🌐" },
  { id: 2, label: "Processing content", icon: "📝" },
  { id: 3, label: "Embedding into vector DB", icon: "🧠" },
  { id: 4, label: "Setting up your brand", icon: "✅" },
];

export default function HomePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    company_name: "",
    industry: "",
    region: "",
    instagram_handle: "",
    linkedin_handle: "",
    twitter_handle: "",
  });

  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name.trim()) {
      setError("Company name is required.");
      return;
    }
    setError("");
    setLoading(true);
    setCurrentStep(1);

    // Simulate step progression while waiting for backend
    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < 3) return prev + 1;
        clearInterval(stepTimer);
        return prev;
      });
    }, 3000);

    try {
      const res = await fetch("http://localhost:8000/brand/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      clearInterval(stepTimer);
      setCurrentStep(4);

      const data = await res.json();

      if (!data.success && data.error) {
        setError(data.message || "Onboarding failed. Please try again.");
        setLoading(false);
        setCurrentStep(0);
        return;
      }

      // Small delay to show final step
      await new Promise((r) => setTimeout(r, 800));

      router.push(
        `/campaign?brand_id=${data.brand_id}&company=${encodeURIComponent(data.company_name)}`
      );
    } catch (err) {
      clearInterval(stepTimer);
      setError("Could not connect to backend. Make sure the server is running.");
      setLoading(false);
      setCurrentStep(0);
    }
  };

  return (
    <div style={styles.page}>
      {/* Background orbs */}
      <div style={styles.orb1} />
      <div style={styles.orb2} />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.badge}>AI-Powered Content Generation</div>
          <h1 style={styles.title}>
            Welcome to{" "}
            <span className="gradient-text">FunnelAI</span>
          </h1>
          <p style={styles.subtitle}>
            Enter your brand's social media handles. We'll scrape, process, and embed
            your content — then help you generate campaigns that actually convert.
          </p>
        </div>

        {/* Card */}
        <div className="glass-card" style={styles.card}>
          {!loading ? (
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label className="field-label" htmlFor="company_name">
                  Company Name *
                </label>
                <input
                  id="company_name"
                  name="company_name"
                  type="text"
                  className="input-field"
                  placeholder="e.g. Tesla, Notion, Stripe"
                  value={form.company_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div style={styles.grid}>
                <div style={styles.formGroup}>
                  <label className="field-label" htmlFor="industry">
                    <span style={styles.platformIcon}>🏭</span> Industry
                  </label>
                  <input
                    id="industry"
                    name="industry"
                    type="text"
                    className="input-field"
                    placeholder="e.g. SaaS, E-commerce, Healthcare"
                    value={form.industry}
                    onChange={handleChange}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label className="field-label" htmlFor="region">
                    <span style={styles.platformIcon}>🌍</span> Region
                  </label>
                  <input
                    id="region"
                    name="region"
                    type="text"
                    className="input-field"
                    placeholder="e.g. India, US, Global"
                    value={form.region}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div style={styles.divider}>
                <span style={styles.dividerText}>Social Media Handles</span>
              </div>

              <div style={styles.grid}>
                <div style={styles.formGroup}>
                  <label className="field-label" htmlFor="instagram_handle">
                    <span style={styles.platformIcon}>📸</span> Instagram Handle
                  </label>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputPrefix}>@</span>
                    <input
                      id="instagram_handle"
                      name="instagram_handle"
                      type="text"
                      className="input-field"
                      style={{ paddingLeft: "32px" }}
                      placeholder="username"
                      value={form.instagram_handle}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label className="field-label" htmlFor="twitter_handle">
                    <span style={styles.platformIcon}>🐦</span> Twitter / X Handle
                  </label>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputPrefix}>@</span>
                    <input
                      id="twitter_handle"
                      name="twitter_handle"
                      type="text"
                      className="input-field"
                      style={{ paddingLeft: "32px" }}
                      placeholder="username"
                      value={form.twitter_handle}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label className="field-label" htmlFor="linkedin_handle">
                  <span style={styles.platformIcon}>💼</span> LinkedIn Company URL
                </label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputPrefix}>@</span>
                  <input
                    id="linkedin_handle"
                    name="linkedin_handle"
                    type="text"
                    className="input-field"
                    style={{ paddingLeft: "32px" }}
                    placeholder="username"
                    value={form.linkedin_handle}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {error && <p style={styles.error}>{error}</p>}

              <button type="submit" className="btn-primary animate-pulse-glow" style={styles.submitBtn}>
                <span>🚀</span> Analyze & Get Started
              </button>

              <p style={styles.hint}>
                At least one social handle is recommended for best results.
              </p>
            </form>
          ) : (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingTitle}>
                Setting up <span className="gradient-text">{form.company_name}</span>
              </div>
              <p style={styles.loadingSubtitle}>
                This may take a minute while we gather your brand data...
              </p>

              <div style={styles.steps}>
                {STEPS.map((step) => {
                  const isDone = currentStep > step.id;
                  const isActive = currentStep === step.id;
                  return (
                    <div key={step.id} style={styles.step}>
                      <div
                        style={{
                          ...styles.stepIcon,
                          ...(isDone ? styles.stepDone : {}),
                          ...(isActive ? styles.stepActive : {}),
                        }}
                      >
                        {isDone ? "✓" : isActive ? <div className="spinner" /> : step.icon}
                      </div>
                      <span
                        style={{
                          ...styles.stepLabel,
                          color: isDone
                            ? "#a855f7"
                            : isActive
                              ? "#f8fafc"
                              : "#475569",
                        }}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        {!loading && (
          <div style={styles.features}>
            {[
              { icon: "🔍", title: "Smart Scraping", desc: "Pulls real posts from Instagram, LinkedIn & Twitter" },
              { icon: "🧠", title: "Vector Embeddings", desc: "Stores your brand voice in semantic memory" },
              { icon: "✨", title: "AI Generation", desc: "Creates images, carousels & video scripts" },
            ].map((f) => (
              <div key={f.title} className="glass-card" style={styles.featureCard}>
                <div style={styles.featureIcon}>{f.icon}</div>
                <div style={styles.featureTitle}>{f.title}</div>
                <div style={styles.featureDesc}>{f.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    position: "relative",
    overflow: "hidden",
  },
  orb1: {
    position: "fixed",
    top: "-20%",
    right: "-10%",
    width: "600px",
    height: "600px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  orb2: {
    position: "fixed",
    bottom: "-20%",
    left: "-10%",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  container: {
    width: "100%",
    maxWidth: "640px",
    position: "relative",
    zIndex: 1,
  },
  header: {
    textAlign: "center",
    marginBottom: "40px",
  },
  badge: {
    display: "inline-block",
    padding: "6px 16px",
    background: "rgba(124, 58, 237, 0.15)",
    border: "1px solid rgba(124, 58, 237, 0.3)",
    borderRadius: "100px",
    fontSize: "12px",
    fontWeight: 500,
    color: "#a855f7",
    marginBottom: "20px",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  title: {
    fontSize: "clamp(36px, 6vw, 52px)",
    fontWeight: 800,
    lineHeight: 1.1,
    marginBottom: "16px",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: "16px",
    color: "#94a3b8",
    lineHeight: 1.7,
    maxWidth: "480px",
    margin: "0 auto",
  },
  card: {
    padding: "40px",
    marginBottom: "32px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "4px 0",
  },
  dividerText: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    whiteSpace: "nowrap",
  },
  inputWrapper: {
    position: "relative",
  },
  inputPrefix: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#475569",
    fontSize: "14px",
    pointerEvents: "none",
    zIndex: 1,
  },
  platformIcon: {
    marginRight: "6px",
  },
  error: {
    color: "#f87171",
    fontSize: "13px",
    padding: "10px 14px",
    background: "rgba(248, 113, 113, 0.08)",
    border: "1px solid rgba(248, 113, 113, 0.2)",
    borderRadius: "8px",
  },
  submitBtn: {
    width: "100%",
    padding: "16px",
    fontSize: "16px",
    marginTop: "4px",
  },
  hint: {
    textAlign: "center",
    fontSize: "12px",
    color: "#475569",
  },
  loadingContainer: {
    textAlign: "center",
    padding: "20px 0",
  },
  loadingTitle: {
    fontSize: "24px",
    fontWeight: 700,
    marginBottom: "8px",
  },
  loadingSubtitle: {
    color: "#94a3b8",
    fontSize: "14px",
    marginBottom: "40px",
  },
  steps: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    textAlign: "left",
    maxWidth: "320px",
    margin: "0 auto",
  },
  step: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  stepIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    flexShrink: 0,
    transition: "all 0.3s ease",
  },
  stepDone: {
    background: "rgba(124, 58, 237, 0.2)",
    border: "1px solid rgba(124, 58, 237, 0.4)",
    color: "#a855f7",
    fontWeight: 700,
    fontSize: "16px",
  },
  stepActive: {
    background: "rgba(59, 130, 246, 0.15)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
  },
  stepLabel: {
    fontSize: "15px",
    fontWeight: 500,
    transition: "color 0.3s ease",
  },
  features: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
  },
  featureCard: {
    padding: "20px",
    textAlign: "center",
  },
  featureIcon: {
    fontSize: "28px",
    marginBottom: "10px",
  },
  featureTitle: {
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "6px",
    color: "#f8fafc",
  },
  featureDesc: {
    fontSize: "12px",
    color: "#64748b",
    lineHeight: 1.5,
  },
};
