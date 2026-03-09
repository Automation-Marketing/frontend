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
    website_url: "",
    instagram_handle: "",
    linkedin_url: "",
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

      await new Promise((r) => setTimeout(r, 800));

      router.push(
        `/campaign/create?brand_id=${data.brand_id}&company=${encodeURIComponent(data.company_name)}`
      );
    } catch {
      clearInterval(stepTimer);
      setError("Could not connect to backend. Make sure the server is running.");
      setLoading(false);
      setCurrentStep(0);
    }
  };

  return (
    <div className="page-wrapper">

      <div className="page-container">
        {/* Hero header */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, marginBottom: "16px", lineHeight: 1.1 }}>
            Welcome to <span className="gradient-text">FunnelAI</span>
          </h1>
          <p style={{ fontSize: "16px", color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: "600px", margin: "0 auto" }}>
            Enter your brand's social media handles. We'll scrape, process, and embed your content then
            help you generate campaigns that actually convert.
          </p>
        </div>

        {loading ? (
          /* ─── Loading State ─── */
          <div style={{ maxWidth: "500px", margin: "0 auto", textAlign: "center" }}>
            <div className="glass-card" style={{ padding: "48px 40px" }}>
              <div style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>
                Setting up <span className="gradient-text">{form.company_name}</span>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "40px" }}>
                This may take a minute while we gather your brand data...
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left", maxWidth: "320px", margin: "0 auto" }}>
                {STEPS.map((step) => {
                  const isDone = currentStep > step.id;
                  const isActive = currentStep === step.id;
                  return (
                    <div key={step.id} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background: isDone ? "rgba(124, 58, 237, 0.2)" : isActive ? "rgba(59, 130, 246, 0.15)" : "var(--bg-glass)",
                          border: isDone ? "1px solid rgba(124, 58, 237, 0.4)" : isActive ? "1px solid rgba(59, 130, 246, 0.3)" : "1px solid var(--glass-border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: isDone ? "16px" : "18px",
                          fontWeight: isDone ? 700 : 400,
                          color: isDone ? "#a855f7" : "inherit",
                          flexShrink: 0,
                          transition: "all 0.3s ease",
                        }}
                      >
                        {isDone ? "✓" : isActive ? <div className="spinner" /> : step.icon}
                      </div>
                      <span
                        style={{
                          fontSize: "15px",
                          fontWeight: 500,
                          color: isDone ? "#a855f7" : isActive ? "var(--text-primary)" : "var(--text-muted)",
                          transition: "color 0.3s ease",
                        }}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ─── Two Column Layout: Form + Smart Scraping ─── */
          <div className="two-col-layout">
            {/* Left: Form */}
            <div className="glass-card" style={{ padding: "36px" }}>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Company Name */}
                <div>
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

                {/* Website URL */}
                <div>
                  <label className="field-label" htmlFor="website_url">
                    🌐 Website URL
                  </label>
                  <input
                    id="website_url"
                    name="website_url"
                    type="text"
                    className="input-field"
                    placeholder="https://yourcompany.com"
                    value={form.website_url}
                    onChange={handleChange}
                  />
                </div>

                {/* Industry & Region row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label className="field-label" htmlFor="industry">
                      🏭 Industry
                    </label>
                    <input
                      id="industry"
                      name="industry"
                      type="text"
                      className="input-field"
                      placeholder="e.g. SaaS, E-commerce"
                      value={form.industry}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="region">
                      🌍 Region
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

                {/* Social Media Handles divider */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "4px 0" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                    Social Media Handles
                  </span>
                  <div style={{ flex: 1, height: "1px", background: "var(--glass-border)" }} />
                </div>

                {/* Instagram & Twitter row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label className="field-label" htmlFor="instagram_handle">
                      📸 Instagram
                    </label>
                    <input
                      id="instagram_handle"
                      name="instagram_handle"
                      type="text"
                      className="input-field"
                      placeholder="@username"
                      value={form.instagram_handle}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="twitter_handle">
                      🐦 Twitter / X
                    </label>
                    <input
                      id="twitter_handle"
                      name="twitter_handle"
                      type="text"
                      className="input-field"
                      placeholder="@username"
                      value={form.twitter_handle}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* LinkedIn */}
                <div>
                  <label className="field-label" htmlFor="linkedin_url">
                    💼 LinkedIn Company URL
                  </label>
                  <input
                    id="linkedin_url"
                    name="linkedin_url"
                    type="text"
                    className="input-field"
                    placeholder="https://linkedin.com/company/your-company"
                    value={form.linkedin_url}
                    onChange={handleChange}
                  />
                </div>

                {error && (
                  <p style={{
                    color: "#f87171",
                    fontSize: "13px",
                    padding: "10px 14px",
                    background: "rgba(248, 113, 113, 0.08)",
                    border: "1px solid rgba(248, 113, 113, 0.2)",
                    borderRadius: "8px",
                  }}>
                    {error}
                  </p>
                )}

                <button type="submit" className="btn-primary animate-pulse-glow" style={{ width: "100%", padding: "16px", fontSize: "16px", marginTop: "4px" }}>
                  <span>🚀</span> Analyze & Get Started
                </button>

                <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)" }}>
                  At least one social handle is recommended.
                </p>
              </form>
            </div>

            {/* Right: Smart Scraping Info */}
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              {/* Illustration placeholder - gradient card */}
              <div style={{
                borderRadius: "20px",
                overflow: "hidden",
                background: "var(--gradient-glass)",
                border: "1px solid var(--glass-border)",
                height: "280px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                backdropFilter: "blur(20px) saturate(1.4)",
              }}>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)" }} />
                <div style={{ position: "relative", textAlign: "center", padding: "20px" }}>
                  <div style={{ fontSize: "64px", marginBottom: "12px" }}>🔍</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>AI-Powered Analysis</div>
                  <div style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "8px" }}>We analyze your social presence automatically</div>
                </div>
              </div>

              {/* Smart Scraping section */}
              <div className="glass-card" style={{ padding: "28px 32px" }}>
                <h2 style={{ fontSize: "26px", fontWeight: 700, marginBottom: "20px", color: "var(--text-primary)" }}>
                  Smart Scraping
                </h2>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[
                    "Scrapes real posts from Instagram, LinkedIn & Twitter",
                    "Understands brand tone automatically",
                    "No manual data entry required",
                    "Filters out spam and irrelevant content",
                    "Adapts to platform changes in real time",
                    "Scales effortlessly as data volume grows",
                  ].map((item, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "var(--text-secondary)" }}>
                      <span style={{ color: "#7c3aed", fontSize: "8px" }}>●</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
