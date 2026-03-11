"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const BACKEND_URL = "http://localhost:8000";

const TEMPLATE_TYPES = [
    {
        id: "educational",
        label: "Educational",
        icon: "🔥",
        desc: "Tips & checklists",
    },
    {
        id: "problem_solution",
        label: "Problem–Solution",
        icon: "⚡",
        desc: "Pain → Gain narrative",
    },
    {
        id: "trust_story",
        label: "Trust Story",
        icon: "💛",
        desc: "Customer proof",
    },
];

const CONTENT_TYPES = [
    { id: "image", label: "Canonical Post", icon: "🗒️", desc: "Caption or Tweet" },
    { id: "carousel", label: "Carousel", icon: "🖼️", desc: "5-slide format with images" },
    { id: "video_script", label: "Video Script", icon: "🎬", desc: "Hook, body & CTA" },
];

type ImageContent = {
    caption: string;
    visual_description: string;
    hashtags: string[];
    image_url?: string;
};

type CarouselSlide = {
    slide_number: number;
    title: string;
    body: string;
    image_url?: string;
};

type CarouselContent = {
    title: string;
    slides: CarouselSlide[];
    cta_slide: { title: string; body: string; image_url?: string };
};

type VideoScript = {
    hook: string;
    body: string;
    cta: string;
    caption: string;
};

type GeneratedContent = {
    template_type?: string;
    tags?: string[];
    canonical_post?: string;
    image?: ImageContent;
    carousel?: CarouselContent;
    video_script?: VideoScript;
    image_url?: string;
    ai_brain?: any;
};

function CampaignCreateInner() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const brandId = searchParams.get("brand_id");
    const companyName = searchParams.get("company") || "Your Brand";

    const [form, setForm] = useState({
        product_service: "",
        icp: "",
        tone: "",
        caption_size: "average",
        description: "",
        content_types: [] as string[],
        template_type: "problem_solution",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState<GeneratedContent | null>(null);
    const [activeTab, setActiveTab] = useState<string>("");
    const [publishing, setPublishing] = useState(false);

    const toggleContentType = (id: string) => {
        setForm((prev) => ({
            ...prev,
            content_types: prev.content_types.includes(id)
                ? prev.content_types.filter((t) => t !== id)
                : [...prev.content_types, id],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.product_service.trim()) { setError("Please specify the campaign title."); return; }
        if (!form.icp.trim()) { setError("Please describe your target audience."); return; }
        if (!form.description.trim()) { setError("Please add a campaign description."); return; }
        if (form.content_types.length === 0) { setError("Select at least one content type."); return; }
        setError("");
        setLoading(true);
        setResult(null);

        try {
            const controller = new AbortController();
            const fetchTimeout = setTimeout(() => controller.abort(), 10 * 60 * 1000);

            const res = await fetch(`${BACKEND_URL}/campaign/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    brand_id: parseInt(brandId || "0"),
                    product_service: form.product_service,
                    icp: form.icp,
                    tone: form.tone,
                    caption_size: form.caption_size,
                    description: form.description,
                    content_types: form.content_types,
                    template_type: form.template_type,
                }),
            });
            clearTimeout(fetchTimeout);

            const data = await res.json();

            if (data.error) {
                setError(data.error);
                setLoading(false);
                return;
            }

            // Redirect to dashboard with campaign_id so content is shown on the calendar
            if (data.campaign_id) {
                const params = new URLSearchParams();
                params.set("campaign_id", String(data.campaign_id));
                if (brandId) params.set("brand_id", brandId);
                if (companyName) params.set("company", companyName);
                router.push(`/campaign?${params.toString()}`);
                return;
            }

            // Fallback: show results inline if no campaign_id
            const content = data.generated_content || data;
            if (data.ai_brain) {
                content.ai_brain = data.ai_brain;
            }
            setResult(content);
            setActiveTab(data.ai_brain ? "ai_brain" : (form.content_types[0] || ""));
        } catch {
            setError("Could not connect to backend. Make sure the server is running.");
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!result || !activeTab) return;
        setPublishing(true);
        try {
            let contentType = activeTab;
            if (contentType === "image") contentType = "canonical";

            const payloadData = JSON.parse(JSON.stringify(result));
            if (payloadData.image_url && !payloadData.image_url.startsWith("http")) {
                payloadData.image_url = `${BACKEND_URL}${payloadData.image_url}`;
            }
            if (payloadData.carousel && payloadData.carousel.slides) {
                payloadData.carousel.slides.forEach((s: any) => {
                    if (s.image_url && !s.image_url.startsWith("http")) s.image_url = `${BACKEND_URL}${s.image_url}`;
                });
                if (payloadData.carousel.cta_slide && payloadData.carousel.cta_slide.image_url) {
                    if (!payloadData.carousel.cta_slide.image_url.startsWith("http")) {
                        payloadData.carousel.cta_slide.image_url = `${BACKEND_URL}${payloadData.carousel.cta_slide.image_url}`;
                    }
                }
            }

            const res = await fetch(`${BACKEND_URL}/publish/telegram`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content_type: contentType,
                    data: payloadData,
                }),
            });
            const data = await res.json();
            if (data.success) {
                alert("Successfully published to Telegram! 🚀");
            } else {
                alert("Failed to publish: " + (data.detail || data.error || "Unknown error"));
            }
        } catch (e) {
            console.error(e);
            alert("Failed to connect to backend for publishing.");
        } finally {
            setPublishing(false);
        }
    };

    return (
        <div className="page-wrapper">

            <div className="page-container">
                <h1 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "32px" }}>
                    Create Campaign
                </h1>

                {/* Show results page if we have them */}
                {result ? (
                    <ResultsView
                        result={result}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        publishing={publishing}
                        handlePublish={handlePublish}
                        contentTypes={form.content_types}
                        onBack={() => { setResult(null); setLoading(false); }}
                    />
                ) : (
                    <div className="two-col-layout form-heavy">
                        {/* Left: Form */}
                        <div className="glass-card" style={{ padding: "36px" }}>
                            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                                {/* Product / Service */}
                                <div>
                                    <label className="field-label">Product / Service</label>
                                    <input
                                        className="input-field"
                                        placeholder="e.g. AI-powered CRM feature launch"
                                        value={form.product_service}
                                        onChange={(e) => setForm({ ...form, product_service: e.target.value })}
                                    />
                                </div>

                                {/* Target Audience */}
                                <div>
                                    <label className="field-label">Target Audience</label>
                                    <input
                                        className="input-field"
                                        placeholder="Startup founders aged 25-40"
                                        value={form.icp}
                                        onChange={(e) => setForm({ ...form, icp: e.target.value })}
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="field-label">Description</label>
                                    <textarea
                                        className="input-field"
                                        style={{ minHeight: "100px", resize: "vertical" }}
                                        placeholder="Describe what this campaign is about, the key message, offer, or story..."
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>

                                {/* Tone */}
                                <div>
                                    <label className="field-label">Tone</label>
                                    <input
                                        className="input-field"
                                        placeholder="e.g. Professional, Casual, Witty, Inspirational"
                                        value={form.tone}
                                        onChange={(e) => setForm({ ...form, tone: e.target.value })}
                                    />
                                </div>

                                {/* Caption Size */}
                                <div>
                                    <label className="field-label">Caption Size</label>
                                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                        {["small", "average"].map((size) => (
                                            <button
                                                key={size}
                                                type="button"
                                                onClick={() => setForm({ ...form, caption_size: size })}
                                                className={`selection-card${form.caption_size === size ? " selected" : ""}`}
                                                style={{ flex: 1, padding: "12px", textAlign: "center" }}
                                            >
                                                <span style={{ fontWeight: 600, fontSize: "14px", textTransform: "capitalize" }}>{size}</span>
                                                <span style={{ display: "block", fontSize: "11px", opacity: 0.7, marginTop: "4px" }}>
                                                    {size === "small" ? "~35 words" : "~100 words"}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Content Strategy */}
                                <div>
                                    <label className="field-label">Content Strategy</label>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginTop: "8px" }}>
                                        {TEMPLATE_TYPES.map((tpl) => (
                                            <button
                                                key={tpl.id}
                                                type="button"
                                                onClick={() => setForm({ ...form, template_type: tpl.id })}
                                                className={`selection-card${form.template_type === tpl.id ? " selected" : ""}`}
                                            >
                                                <span style={{ fontSize: "24px" }}>{tpl.icon}</span>
                                                <span style={{ fontWeight: 600, fontSize: "13px" }}>{tpl.label}</span>
                                                <span style={{ fontSize: "11px", opacity: 0.7 }}>{tpl.desc}</span>
                                                {form.template_type === tpl.id && (
                                                    <div className="checkmark">✓</div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Content Types */}
                                <div>
                                    <label className="field-label">Content Types</label>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                                        {CONTENT_TYPES.map((ct) => {
                                            const selected = form.content_types.includes(ct.id);
                                            return (
                                                <button
                                                    key={ct.id}
                                                    type="button"
                                                    onClick={() => toggleContentType(ct.id)}
                                                    className={`selection-card${selected ? " selected" : ""}`}
                                                >
                                                    <span style={{ fontSize: "24px" }}>{ct.icon}</span>
                                                    <span style={{ fontWeight: 600, fontSize: "13px" }}>{ct.label}</span>
                                                    <span style={{ fontSize: "11px", opacity: 0.7 }}>{ct.desc}</span>
                                                    {selected && <div className="checkmark">✓</div>}
                                                </button>
                                            );
                                        })}
                                    </div>
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

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{ width: "100%", padding: "16px", fontSize: "15px" }}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <div className="spinner" />
                                            Generating with AI...
                                        </>
                                    ) : (
                                        <>✨ Generate Campaign</>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Right: AI Smart Suggestions / Preview */}
                        <div style={{ position: "sticky" }}>
                            {/* <div className="ai-panel">
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                                    <span style={{ fontSize: "24px" }}>🤖</span>
                                    <h3 style={{ fontSize: "18px", fontWeight: 700 }}>AI Smart Suggestions</h3>
                                </div>
                                <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.7 }}>
                                    Fill in your campaign details and click Generate!
                                </p>
                            </div> */}

                            {/* Campaign Preview */}
                            <div className="glass-card" style={{ marginTop: "24px", padding: "24px" }}>
                                <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px" }}>Campaign Preview</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <div>
                                        <span style={{ fontWeight: 600, marginRight: "8px" }}>Product/Service:</span>
                                        <span style={{ color: "var(--text-secondary)" }}>{form.product_service || "—"}</span>
                                    </div>
                                    <div>
                                        <span style={{ fontWeight: 600, marginRight: "8px" }}>Audience:</span>
                                        <span style={{ color: "var(--text-secondary)" }}>{form.icp || "—"}</span>
                                    </div>
                                    <div>
                                        <span style={{ fontWeight: 600, marginRight: "8px" }}>Strategy:</span>
                                        <span style={{ color: "var(--text-secondary)" }}>
                                            {TEMPLATE_TYPES.find(t => t.id === form.template_type)?.label || "—"}
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{ fontWeight: 600, marginRight: "8px" }}>Type:</span>
                                        <span style={{ color: "var(--text-secondary)" }}>
                                            {form.content_types.length > 0
                                                ? form.content_types.map(id => CONTENT_TYPES.find(ct => ct.id === id)?.label).join(", ")
                                                : "—"}
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{ fontWeight: 600, marginRight: "8px" }}>Tone:</span>
                                        <span style={{ color: "var(--text-secondary)" }}>{form.tone}</span>
                                    </div>
                                    <div>
                                        <span style={{ fontWeight: 600, marginRight: "8px" }}>Caption Size:</span>
                                        <span style={{ color: "var(--text-secondary)", textTransform: "capitalize" }}>{form.caption_size}</span>
                                    </div>
                                    {form.description && (
                                        <div>
                                            <span style={{ fontWeight: 600, marginRight: "8px" }}>Description:</span>
                                            <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                                                {form.description.length > 120 ? form.description.slice(0, 120) + "..." : form.description}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Results View ─── */

function ResultsView({
    result,
    activeTab,
    setActiveTab,
    publishing,
    handlePublish,
    contentTypes,
    onBack,
}: {
    result: GeneratedContent;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    publishing: boolean;
    handlePublish: () => void;
    contentTypes: string[];
    onBack: () => void;
}) {
    return (
        <div className="animate-fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <button
                    onClick={onBack}
                    style={{
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#94a3b8",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                    }}
                >
                    ← Back to Form
                </button>
                <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="btn-primary"
                    style={{ padding: "10px 24px" }}
                >
                    {publishing ? (
                        <><div className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} /> Publishing...</>
                    ) : (
                        <>🚀 Publish to Telegram</>
                    )}
                </button>
            </div>

            {/* Template badge */}
            {result.template_type && (
                <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 14px",
                    background: "rgba(124, 58, 237, 0.1)",
                    border: "1px solid rgba(124, 58, 237, 0.25)",
                    borderRadius: "100px",
                    fontSize: "12px",
                    color: "#c4b5fd",
                    fontWeight: 600,
                    marginBottom: "16px",
                    letterSpacing: "0.04em",
                    textTransform: "capitalize",
                }}>
                    {result.template_type.replace("_", "–")}
                </div>
            )}

            {/* Canonical post */}
            {result.canonical_post && (
                <ResultCard icon="✍️" title="Canonical Post">
                    {result.image_url && (
                        <div style={{ width: "100%", borderRadius: "12px", overflow: "hidden", marginBottom: "16px", background: "rgba(0,0,0,0.2)", aspectRatio: "1 / 1" }}>
                            <img src={`${BACKEND_URL}${result.image_url}`} alt="AI Generated" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                    )}
                    <p style={{ fontSize: "16px", lineHeight: 1.7, color: "#f1f5f9", whiteSpace: "pre-wrap" }}>
                        {typeof result.canonical_post === 'string'
                            ? result.canonical_post
                            : (result.canonical_post as any).body || (result.canonical_post as any).value || JSON.stringify(result.canonical_post)}
                    </p>
                </ResultCard>
            )}

            {/* Tags */}
            {result.tags && result.tags.length > 0 && (
                <ResultCard icon="🏷️" title="Auto-Tags">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {result.tags.map((tag, i) => (
                            <span key={i} className="hashtag">#{tag.replace(/^#+/, '')}</span>
                        ))}
                    </div>
                </ResultCard>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
                {result.ai_brain && (
                    <button onClick={() => setActiveTab("ai_brain")} className={`tab-btn${activeTab === "ai_brain" ? " active" : ""}`}>
                        🧠 AI Brain
                    </button>
                )}
                {CONTENT_TYPES.filter((ct) => result[ct.id as keyof GeneratedContent]).map((ct) => (
                    <button key={ct.id} onClick={() => setActiveTab(ct.id)} className={`tab-btn${activeTab === ct.id ? " active" : ""}`}>
                        {ct.icon} {ct.label}
                    </button>
                ))}
            </div>

            {activeTab === "ai_brain" && result.ai_brain && <AiBrainResult data={result.ai_brain} />}
            {activeTab === "image" && result.image && <ImageResult data={result.image} />}
            {activeTab === "carousel" && result.carousel && <CarouselResult data={result.carousel} />}
            {activeTab === "video_script" && result.video_script && <VideoScriptResult data={result.video_script} />}
        </div>
    );
}

/* ─── Result Components ─── */

function AiBrainResult({ data }: { data: any }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <ResultCard icon="🎯" title="Positioning">
                <p style={{ fontSize: "16px", lineHeight: 1.7, color: "#f1f5f9" }}>{data.positioning?.statement || "N/A"}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
                    {data.positioning?.taglines?.map((t: string, i: number) => (
                        <span key={i} className="hashtag">"{t}"</span>
                    ))}
                </div>
            </ResultCard>

            <ResultCard icon="👥" title="Target Audience">
                <div style={{ marginBottom: "16px" }}>
                    <strong style={{ color: "#f8fafc" }}>Primary:</strong>{" "}
                    <span style={{ color: "#94a3b8", fontSize: "14px" }}>{data.target_users?.primary?.profile || "N/A"}</span>
                </div>
                <div>
                    <strong style={{ color: "#f8fafc" }}>Secondary:</strong>{" "}
                    <span style={{ color: "#94a3b8", fontSize: "14px" }}>{data.target_users?.secondary?.profile || "N/A"}</span>
                </div>
            </ResultCard>

            <ResultCard icon="⚔️" title="Competition & Alternatives">
                <div style={{ marginBottom: "16px" }}>
                    <strong style={{ color: "#f8fafc" }}>Competitors:</strong>{" "}
                    <span style={{ color: "#94a3b8", fontSize: "14px" }}>{(data.competitors || []).join(", ") || "N/A"}</span>
                </div>
                <div style={{ marginBottom: "16px" }}>
                    <strong style={{ color: "#f8fafc" }}>Alternatives:</strong>{" "}
                    <span style={{ color: "#94a3b8", fontSize: "14px" }}>{data.alternative_product || "N/A"}</span>
                </div>
                <div>
                    <strong style={{ color: "#f8fafc" }}>Advantages:</strong>{" "}
                    <span style={{ color: "#94a3b8", fontSize: "14px" }}>{data.advantages || "N/A"}</span>
                </div>
            </ResultCard>

            <ResultCard icon="💡" title="Use Cases">
                {data.use_cases && data.use_cases.length > 0 ? data.use_cases.map((uc: any, i: number) => (
                    <div key={i} style={{ marginBottom: "12px" }}>
                        <strong style={{ color: "#f8fafc" }}>{uc.title}:</strong>{" "}
                        <span style={{ color: "#94a3b8", fontSize: "14px" }}>{uc.description}</span>
                    </div>
                )) : <span style={{ color: "#94a3b8", fontSize: "14px" }}>N/A</span>}
            </ResultCard>

            <ResultCard icon="📈" title="Objectives">
                <ul style={{ paddingLeft: "20px", margin: "10px 0", color: "#94a3b8", fontSize: "14px" }}>
                    {data.objectives && data.objectives.length > 0 ? data.objectives.map((obj: string, i: number) => (
                        <li key={i}>{obj}</li>
                    )) : <li>N/A</li>}
                </ul>
            </ResultCard>
        </div>
    );
}

function ImageResult({ data }: { data: ImageContent }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {data.image_url && (
                <ResultCard icon="🖼️" title="AI Generated Image">
                    <div style={{ width: "100%", borderRadius: "12px", overflow: "hidden", background: "rgba(0,0,0,0.2)", aspectRatio: "1 / 1" }}>
                        <img src={`${BACKEND_URL}${data.image_url}`} alt="AI Generated" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                </ResultCard>
            )}
            <ResultCard icon="📝" title="Caption">
                <p style={{ fontSize: "16px", lineHeight: 1.7, color: "#f1f5f9" }}>{data.caption}</p>
            </ResultCard>
            <ResultCard icon="🎨" title="Visual Direction">
                <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.7 }}>{data.visual_description}</p>
            </ResultCard>
            {data.hashtags && data.hashtags.length > 0 && (
                <ResultCard icon="#️⃣" title="Hashtags">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {data.hashtags.map((tag, i) => (
                            <span key={i} className="hashtag">{tag.startsWith("#") ? tag : `#${tag}`}</span>
                        ))}
                    </div>
                </ResultCard>
            )}
        </div>
    );
}

function CarouselResult({ data }: { data: CarouselContent }) {
    const [activeSlide, setActiveSlide] = useState(0);
    const allSlides = [...data.slides, { slide_number: data.slides.length + 1, title: data.cta_slide.title, body: data.cta_slide.body }];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <ResultCard icon="📌" title={data.title}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                    {allSlides.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveSlide(i)}
                            className={`tab-btn${activeSlide === i ? " active" : ""}`}
                            style={{ padding: "4px 12px", fontSize: "12px" }}
                        >
                            {i === allSlides.length - 1 ? "CTA" : i + 1}
                        </button>
                    ))}
                </div>
                <div className="glass-card" style={{ padding: "24px", minHeight: "160px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                        {activeSlide === allSlides.length - 1 ? "CTA Slide" : `Slide ${activeSlide + 1}`}
                    </div>
                    {(allSlides[activeSlide] as any).image_url && (
                        <div style={{ width: "100%", borderRadius: "12px", overflow: "hidden", marginBottom: "16px", background: "rgba(0,0,0,0.2)", aspectRatio: "16 / 9" }}>
                            <img src={`${BACKEND_URL}${(allSlides[activeSlide] as any).image_url}`} alt={`Slide ${activeSlide + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                    )}
                    <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#f8fafc", marginBottom: "12px" }}>{allSlides[activeSlide].title}</h3>
                    <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.7 }}>{allSlides[activeSlide].body}</p>
                </div>
                <div style={{ textAlign: "center", fontSize: "12px", color: "#475569", marginTop: "12px" }}>
                    {activeSlide + 1} / {allSlides.length}
                </div>
            </ResultCard>
        </div>
    );
}

function VideoScriptResult({ data }: { data: VideoScript }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <ResultCard icon="🎣" title="Hook (0–3 seconds)">
                <p style={{ fontSize: "16px", lineHeight: 1.7, color: "#f1f5f9" }}>{data.hook}</p>
            </ResultCard>
            <ResultCard icon="▶️" title="Main Script">
                <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.7 }}>{data.body}</p>
            </ResultCard>
            <ResultCard icon="📣" title="Call to Action">
                <p style={{ fontSize: "16px", lineHeight: 1.7, color: "#f1f5f9" }}>{data.cta}</p>
            </ResultCard>
            {data.caption && (
                <ResultCard icon="💬" title="Video Caption">
                    <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.7 }}>{data.caption}</p>
                </ResultCard>
            )}
        </div>
    );
}

function ResultCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
    return (
        <div className="result-card">
            <div className="result-card-header">
                <span style={{ fontSize: "18px" }}>{icon}</span>
                <span className="result-card-title">{title}</span>
            </div>
            <div>{children}</div>
        </div>
    );
}

const BACKEND_URL_CONST = BACKEND_URL;

export default function CampaignCreatePage() {
    return (
        <Suspense fallback={<div style={{ color: "#94a3b8", padding: "40px", textAlign: "center" }}>Loading...</div>}>
            <CampaignCreateInner />
        </Suspense>
    );
}
