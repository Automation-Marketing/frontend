"use client";

import React, { useState, useEffect, Suspense, ReactNode } from "react";
import { useSearchParams } from "next/navigation";

const BACKEND_URL = "http://localhost:8000";

type Platform = "instagram" | "twitter" | "linkedin";

type SavedPlatforms = {
    [key in Platform]?: {
        connected: boolean;
        account_id?: string;
        connected_at?: string;
    };
};

const PLATFORM_META: Record<Platform, { label: string; color: string; icon: ReactNode; description: string; fields: FieldDef[] }> = {
    twitter: {
        label: "Twitter / X",
        color: "#fff",
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
        ),
        description: "Post tweets and media with OAuth 1.0a credentials from the Twitter Developer Portal.",
        fields: [
            { key: "api_key", label: "API Key", placeholder: "Your Twitter App API Key", isSecret: false },
            { key: "api_secret", label: "API Key Secret", placeholder: "Your Twitter App API Key Secret", isSecret: true },
            { key: "access_token", label: "Access Token", placeholder: "Your User Access Token", isSecret: false },
            { key: "access_token_secret", label: "Access Token Secret", placeholder: "Your User Access Token Secret", isSecret: true },
        ],
    },
    linkedin: {
        label: "LinkedIn",
        color: "#0A66C2",
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#0A66C2">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
        ),
        description: "Publish posts as a person or organization using your LinkedIn API access token and URN.",
        fields: [
            { key: "access_token", label: "Access Token", placeholder: "LinkedIn OAuth 2.0 Access Token", isSecret: true },
            { key: "platform_account_id", label: "Author URN", placeholder: "urn:li:person:XXXXX or urn:li:organization:XXXXX", isSecret: false },
        ],
    },
    instagram: {
        label: "Instagram",
        color: "#E1306C",
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <defs>
                    <linearGradient id="ig-settings-gradient" x1="0" y1="24" x2="24" y2="0">
                        <stop stopColor="#FED373" />
                        <stop offset=".26" stopColor="#F15245" />
                        <stop offset=".55" stopColor="#D92E7F" />
                        <stop offset=".83" stopColor="#9B36B7" />
                        <stop offset="1" stopColor="#515ECF" />
                    </linearGradient>
                </defs>
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-settings-gradient)" strokeWidth="2" />
                <circle cx="12" cy="12" r="4.5" stroke="url(#ig-settings-gradient)" strokeWidth="2" />
                <circle cx="17.5" cy="6.5" r="1.25" fill="url(#ig-settings-gradient)" />
            </svg>
        ),
        description: "Publish images and carousels via the Instagram Graph API using a business account access token.",
        fields: [
            { key: "access_token", label: "Access Token", placeholder: "Facebook / Instagram Graph API Access Token", isSecret: true },
            { key: "platform_account_id", label: "Business Account ID", placeholder: "Instagram Business Account ID", isSecret: false },
        ],
    },
};

type FieldDef = {
    key: string;
    label: string;
    placeholder: string;
    isSecret: boolean;
};

function SettingsInner() {
    const searchParams = useSearchParams();
    const brandId = searchParams.get("brand_id") || "";

    const [selectedPlatform, setSelectedPlatform] = useState<Platform>("twitter");
    const [formValues, setFormValues] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [connectedPlatforms, setConnectedPlatforms] = useState<SavedPlatforms>({});
    const [loadingConnected, setLoadingConnected] = useState(false);
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
    const [brandIdInput, setBrandIdInput] = useState(brandId);

    useEffect(() => {
        if (brandIdInput) {
            loadConnectedPlatforms(brandIdInput);
        }
    }, [brandIdInput]);

    const loadConnectedPlatforms = async (bid: string) => {
        setLoadingConnected(true);
        try {
            const res = await fetch(`${BACKEND_URL}/publish/credentials/${bid}`);
            const data = await res.json();
            if (data.success) {
                setConnectedPlatforms(data.platforms || {});
            }
        } catch {
            // Silently fail — brand may not have credentials yet
        } finally {
            setLoadingConnected(false);
        }
    };

    const handleSave = async () => {
        if (!brandIdInput) {
            setSaveError("Please enter your Brand ID first.");
            return;
        }
        setSaving(true);
        setSaveError("");
        setSaveSuccess(false);

        const payload: Record<string, any> = {
            brand_id: parseInt(brandIdInput),
            platform: selectedPlatform,
        };
        PLATFORM_META[selectedPlatform].fields.forEach((f) => {
            payload[f.key] = formValues[f.key] || null;
        });

        try {
            const res = await fetch(`${BACKEND_URL}/publish/credentials`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
                loadConnectedPlatforms(brandIdInput);
            } else {
                setSaveError(data.detail || "Failed to save credentials.");
            }
        } catch {
            setSaveError("Could not connect to backend. Make sure the server is running.");
        } finally {
            setSaving(false);
        }
    };

    const meta = PLATFORM_META[selectedPlatform];

    return (
        <div className="page-wrapper">
            <div className="page-container">
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "48px" }}>
                    <h1 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, marginBottom: "12px", lineHeight: 1.1 }}>
                        ⚙️ Social Media <span className="gradient-text">Settings</span>
                    </h1>
                    <p style={{ fontSize: "15px", color: "var(--text-secondary)", maxWidth: "560px", margin: "0 auto", lineHeight: 1.7 }}>
                        Connect your social accounts by adding API credentials. These are stored securely and used when you publish content.
                    </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "32px", alignItems: "start" }}>
                    {/* Left: Platform Selector + Brand ID */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {/* Brand ID input */}
                        <div className="glass-card" style={{ padding: "20px" }}>
                            <label className="field-label" style={{ marginBottom: "10px" }}>🏷️ Brand ID</label>
                            <input
                                type="number"
                                className="input-field"
                                placeholder="Enter your brand ID"
                                value={brandIdInput}
                                onChange={(e) => setBrandIdInput(e.target.value)}
                            />
                            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px", lineHeight: 1.5 }}>
                                Your brand ID is shown in the URL when creating a campaign.
                            </p>
                        </div>

                        {/* Platform buttons */}
                        <div className="glass-card" style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 8px 4px" }}>
                                Platforms
                            </div>
                            {(Object.keys(PLATFORM_META) as Platform[]).map((platform) => {
                                const pm = PLATFORM_META[platform];
                                const isConnected = !!connectedPlatforms[platform]?.connected;
                                const isActive = selectedPlatform === platform;
                                return (
                                    <button
                                        key={platform}
                                        onClick={() => {
                                            setSelectedPlatform(platform);
                                            setFormValues({});
                                            setSaveError("");
                                            setSaveSuccess(false);
                                        }}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "12px",
                                            padding: "12px 14px",
                                            borderRadius: "12px",
                                            border: isActive ? "1px solid rgba(124, 58, 237, 0.5)" : "1px solid transparent",
                                            background: isActive ? "rgba(124, 58, 237, 0.12)" : "transparent",
                                            cursor: "pointer",
                                            color: "var(--text-primary)",
                                            transition: "all 0.2s ease",
                                            width: "100%",
                                            textAlign: "left",
                                        }}
                                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                                        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                                    >
                                        {pm.icon}
                                        <span style={{ flex: 1, fontWeight: 500, fontSize: "14px" }}>{pm.label}</span>
                                        {isConnected && (
                                            <span style={{
                                                fontSize: "10px", fontWeight: 700, color: "#4ade80",
                                                background: "rgba(74, 222, 128, 0.12)", border: "1px solid rgba(74, 222, 128, 0.25)",
                                                borderRadius: "100px", padding: "2px 8px",
                                            }}>✓ Live</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Connected platforms summary */}
                        {loadingConnected && (
                            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "13px", padding: "12px" }}>
                                <div className="spinner" style={{ margin: "0 auto 8px", width: "16px", height: "16px" }} />
                                Loading connections...
                            </div>
                        )}
                    </div>

                    {/* Right: Credentials Form */}
                    <div className="glass-card" style={{ padding: "32px" }}>
                        {/* Platform header */}
                        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "8px" }}>
                            <div style={{
                                width: "48px", height: "48px", borderRadius: "14px",
                                background: "rgba(255,255,255,0.06)", border: "1px solid var(--glass-border)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                                {meta.icon}
                            </div>
                            <div>
                                <h2 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>{meta.label}</h2>
                                {connectedPlatforms[selectedPlatform]?.connected && (
                                    <span style={{ fontSize: "12px", color: "#4ade80", fontWeight: 600 }}>✓ Connected</span>
                                )}
                            </div>
                        </div>
                        <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "28px", paddingBottom: "20px", borderBottom: "1px solid var(--glass-border)" }}>
                            {meta.description}
                        </p>

                        {/* Setup Guide */}
                        <SetupGuide platform={selectedPlatform} />

                        {/* Fields */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginBottom: "24px" }}>
                            {meta.fields.map((field) => (
                                <div key={field.key}>
                                    <label className="field-label" htmlFor={`field-${field.key}`}>{field.label}</label>
                                    <div style={{ position: "relative" }}>
                                        <input
                                            id={`field-${field.key}`}
                                            type={field.isSecret && !showSecrets[field.key] ? "password" : "text"}
                                            className="input-field"
                                            placeholder={field.placeholder}
                                            value={formValues[field.key] || ""}
                                            onChange={(e) => setFormValues({ ...formValues, [field.key]: e.target.value })}
                                            style={{ paddingRight: field.isSecret ? "44px" : "16px", fontFamily: field.isSecret && !showSecrets[field.key] ? "monospace" : "inherit" }}
                                        />
                                        {field.isSecret && (
                                            <button
                                                type="button"
                                                onClick={() => setShowSecrets({ ...showSecrets, [field.key]: !showSecrets[field.key] })}
                                                style={{
                                                    position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                                                    background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)",
                                                    fontSize: "14px", padding: "4px",
                                                }}
                                                title={showSecrets[field.key] ? "Hide" : "Show"}
                                            >
                                                {showSecrets[field.key] ? "🙈" : "👁️"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Save Button */}
                        {saveError && (
                            <div style={{
                                padding: "12px 16px", borderRadius: "10px", background: "rgba(248, 113, 113, 0.08)",
                                border: "1px solid rgba(248, 113, 113, 0.2)", color: "#f87171", fontSize: "13px",
                                marginBottom: "16px",
                            }}>
                                {saveError}
                            </div>
                        )}
                        {saveSuccess && (
                            <div style={{
                                padding: "12px 16px", borderRadius: "10px", background: "rgba(74, 222, 128, 0.08)",
                                border: "1px solid rgba(74, 222, 128, 0.2)", color: "#4ade80", fontSize: "13px",
                                marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px",
                            }}>
                                ✓ Credentials saved successfully!
                            </div>
                        )}

                        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ width: "100%", padding: "14px" }}>
                            {saving ? (
                                <><div className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} /> Saving...</>
                            ) : (
                                <>🔑 Save {meta.label} Credentials</>
                            )}
                        </button>

                        {/* Security note */}
                        <p style={{ textAlign: "center", fontSize: "11px", color: "var(--text-muted)", marginTop: "14px", lineHeight: 1.5 }}>
                            🔒 Credentials are stored in your database and never logged or shared.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SetupGuide({ platform }: { platform: Platform }) {
    const [open, setOpen] = useState(false);
    const guides: Record<Platform, { steps: string[]; links: { label: string; url: string }[] }> = {
        twitter: {
            steps: [
                "Go to the Twitter Developer Portal and create a Project + App.",
                'Under "User authentication settings", enable OAuth 1.0a with "Read and write" permissions.',
                'Go to "Keys and Tokens" → generate API Key & Secret.',
                "Generate Access Token & Access Token Secret (must be Read+Write).",
                "Paste all 4 values in the form on the right.",
            ],
            links: [
                { label: "Twitter Developer Portal", url: "https://developer.twitter.com/en/portal/dashboard" },
            ],
        },
        linkedin: {
            steps: [
                "Go to the LinkedIn Developer Portal and create an App.",
                'Under "Products", request access to "Share on LinkedIn" (for personal) or "Marketing Developer Platform" (for org).',
                'Use the "Token Generator" under "Auth" tab to get an Access Token with \'w_member_social\' scope.',
                "Find your Person URN: call GET https://api.linkedin.com/v2/me with your token.",
                "For an Org page URN, use: urn:li:organization:YOUR_ORG_ID (from the company page URL).",
            ],
            links: [
                { label: "LinkedIn Developer Portal", url: "https://developer.linkedin.com/" },
                { label: "Getting your Person URN", url: "https://docs.microsoft.com/en-us/linkedin/shared/references/v2/profile/lite-profile" },
            ],
        },
        instagram: {
            steps: [
                "You need a Facebook Business Account linked to an Instagram Professional (Business/Creator) Account.",
                "Go to Meta for Developers → create an App with 'Business' type.",
                "Add the 'Instagram Graph API' product to your app.",
                "Generate a User Access Token with instagram_basic, instagram_content_publish, and pages_read_engagement permissions.",
                "Convert it to a Long-Lived Token (valid 60 days).",
                "Find your Instagram Business Account ID via GET /me/accounts endpoint.",
            ],
            links: [
                { label: "Meta Developer Portal", url: "https://developers.facebook.com/" },
                { label: "IG Graph API Docs", url: "https://developers.facebook.com/docs/instagram-api/" },
            ],
        },
    };

    const guide = guides[platform];

    return (
        <div style={{ marginBottom: "24px" }}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    display: "flex", alignItems: "center", gap: "8px", background: "rgba(124, 58, 237, 0.08)",
                    border: "1px solid rgba(124, 58, 237, 0.2)", borderRadius: "10px", padding: "10px 16px",
                    color: "var(--purple-light)", fontSize: "13px", fontWeight: 600, cursor: "pointer", width: "100%",
                    transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124, 58, 237, 0.14)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(124, 58, 237, 0.08)"; }}
            >
                📖 How to get credentials {open ? "▲" : "▼"}
            </button>

            {open && (
                <div style={{
                    marginTop: "12px", padding: "16px 18px", background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--glass-border)", borderRadius: "12px",
                    animation: "fadeIn 0.2s ease-out",
                }}>
                    <ol style={{ paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {guide.steps.map((step, i) => (
                            <li key={i} style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                                {step}
                            </li>
                        ))}
                    </ol>
                    {guide.links.length > 0 && (
                        <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--glass-border)", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {guide.links.map((link, i) => (
                                <a
                                    key={i}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        fontSize: "12px", color: "var(--purple-light)", fontWeight: 600,
                                        textDecoration: "none", padding: "4px 12px",
                                        background: "rgba(124, 58, 237, 0.08)", border: "1px solid rgba(124, 58, 237, 0.2)",
                                        borderRadius: "100px", transition: "all 0.2s",
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124, 58, 237, 0.18)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(124, 58, 237, 0.08)"; }}
                                >
                                    🔗 {link.label}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={<div style={{ color: "#94a3b8", padding: "40px", textAlign: "center" }}>Loading...</div>}>
            <SettingsInner />
        </Suspense>
    );
}
