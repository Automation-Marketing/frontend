"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const TONES = ["Professional", "Casual", "Witty", "Inspirational", "Bold"];
const BACKEND_URL = "http://localhost:8000";

const TEMPLATE_TYPES = [
    {
        id: "educational",
        label: "Educational",
        icon: "📚",
        desc: "Tips & checklists",
        color: "rgba(16, 185, 129, 0.2)",
        border: "rgba(16, 185, 129, 0.4)",
        textColor: "#6ee7b7",
    },
    {
        id: "problem_solution",
        label: "Problem–Solution",
        icon: "⚡",
        desc: "Pain → Gain narrative",
        color: "rgba(245, 158, 11, 0.2)",
        border: "rgba(245, 158, 11, 0.4)",
        textColor: "#fcd34d",
    },
    {
        id: "trust_story",
        label: "Trust Story",
        icon: "🤝",
        desc: "Customer proof",
        color: "rgba(124, 58, 237, 0.2)",
        border: "rgba(124, 58, 237, 0.4)",
        textColor: "#c4b5fd",
    },
];

const CONTENT_TYPES = [
    { id: "image", label: "Canonical Post", icon: "🗒️", desc: "Caption or Tweet" },
    { id: "carousel", label: "Carousel", icon: "🖼️", desc: "5-slide story format with images" },
    { id: "video_script", label: "Video Script", icon: "🎞️", desc: "Hook, body & CTA" },
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
    image_url?: string; // Root level image for canonical post
    ai_brain?: any;
};

function CampaignPageInner() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const brandId = searchParams.get("brand_id");
    const companyName = searchParams.get("company") || "Your Brand";

    const [form, setForm] = useState({
        product_service: "",
        icp: "",
        tone: "Professional",
        description: "",
        content_types: [] as string[],
        template_type: "educational",
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
        if (!form.product_service.trim()) { setError("Please specify the product or service being launched."); return; }
        if (!form.icp.trim()) { setError("Please describe your target audience."); return; }
        if (!form.description.trim()) { setError("Please add a campaign description."); return; }
        if (form.content_types.length === 0) { setError("Select at least one content type."); return; }
        setError("");
        setLoading(true);
        setResult(null);

        try {
            // Llama3 on CPU can take 5-10 minutes — give it time
            const controller = new AbortController();
            const fetchTimeout = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10 min

            const res = await fetch(`${BACKEND_URL}/campaign/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    brand_id: parseInt(brandId || "0"),
                    product_service: form.product_service,
                    icp: form.icp,
                    tone: form.tone,
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

            // Backend now returns generated_content with the full RAG output
            const content = data.generated_content || data;
            // Merge ai_brain from top-level response into result
            if (data.ai_brain) {
                content.ai_brain = data.ai_brain;
            }
            setResult(content);
            // Set active tab to AI Brain by default, or first generated content
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

            // Format full image URLs if present
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
        <div style={styles.page}>
            <div style={styles.orb1} />
            <div style={styles.orb2} />

            <div style={styles.container}>
                {/* Top nav */}
                <div style={styles.nav}>
                    <button onClick={() => router.push("/")} style={styles.backBtn}>
                        ← Back
                    </button>
                    <div style={styles.navBrand}>
                        <span className="gradient-text" style={{ fontWeight: 700, fontSize: "18px" }}>FunnelAI</span>
                    </div>
                    <div style={styles.companyBadge}>
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>Brand:</span>
                        <span style={{ fontWeight: 600, color: "#f8fafc", marginLeft: "6px" }}>{companyName}</span>
                    </div>
                </div>

                <div style={styles.layout}>
                    {/* Left: Form */}
                    <div style={styles.formCol}>
                        <div style={styles.formHeader}>
                            <h1 style={styles.title}>Create Campaign</h1>
                            <p style={styles.subtitle}>Define your audience and let AI generate content tailored to your brand.</p>
                        </div>

                        <form onSubmit={handleSubmit} style={styles.form}>
                            {/* Product/Service */}
                            <div style={styles.fieldGroup}>
                                <label className="field-label" htmlFor="product_service">
                                    Product / Service
                                </label>
                                <input
                                    id="product_service"
                                    className="input-field"
                                    placeholder="e.g. AI-powered CRM feature launch"
                                    value={form.product_service}
                                    onChange={(e) => setForm({ ...form, product_service: e.target.value })}
                                />
                            </div>

                            {/* ICP */}
                            <div style={styles.fieldGroup}>
                                <label className="field-label" htmlFor="icp">
                                    Target Audience (ICP)
                                </label>
                                <input
                                    id="icp"
                                    className="input-field"
                                    placeholder="e.g. SaaS founders aged 30-45 who struggle with lead gen"
                                    value={form.icp}
                                    onChange={(e) => setForm({ ...form, icp: e.target.value })}
                                />
                            </div>

                            {/* Tone */}
                            <div style={styles.fieldGroup}>
                                <label className="field-label">Tone</label>
                                <div style={styles.toneGrid}>
                                    {TONES.map((tone) => (
                                        <button
                                            key={tone}
                                            type="button"
                                            onClick={() => setForm({ ...form, tone })}
                                            style={{
                                                ...styles.toneBtn,
                                                ...(form.tone === tone ? styles.toneBtnActive : {}),
                                            }}
                                        >
                                            {tone}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div style={styles.fieldGroup}>
                                <label className="field-label" htmlFor="description">
                                    Campaign Description
                                </label>
                                <textarea
                                    id="description"
                                    className="input-field"
                                    style={{ minHeight: "100px", resize: "vertical" }}
                                    placeholder="Describe what this campaign is about, the key message, offer, or story..."
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            {/* Template Type */}
                            <div style={styles.fieldGroup}>
                                <label className="field-label">Content Strategy</label>
                                <div style={styles.templateGrid}>
                                    {TEMPLATE_TYPES.map((tpl) => (
                                        <button
                                            key={tpl.id}
                                            type="button"
                                            onClick={() => setForm({ ...form, template_type: tpl.id })}
                                            style={{
                                                ...styles.templateBtn,
                                                ...(form.template_type === tpl.id
                                                    ? {
                                                        background: tpl.color,
                                                        border: `1px solid ${tpl.border}`,
                                                        color: tpl.textColor,
                                                    }
                                                    : {}),
                                            }}
                                        >
                                            <span style={{ fontSize: "22px" }}>{tpl.icon}</span>
                                            <span style={{ fontWeight: 600, fontSize: "12px" }}>{tpl.label}</span>
                                            <span style={{ fontSize: "11px", opacity: 0.7 }}>{tpl.desc}</span>
                                            {form.template_type === tpl.id && (
                                                <div style={{ ...styles.checkmark, background: tpl.border.replace("0.4", "0.9") }}>✓</div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Content Types */}
                            <div style={styles.fieldGroup}>
                                <label className="field-label">Content Types</label>
                                <div style={styles.contentTypeGrid}>
                                    {CONTENT_TYPES.map((ct) => {
                                        const selected = form.content_types.includes(ct.id);
                                        return (
                                            <button
                                                key={ct.id}
                                                type="button"
                                                onClick={() => toggleContentType(ct.id)}
                                                style={{
                                                    ...styles.contentTypeBtn,
                                                    ...(selected ? styles.contentTypeBtnActive : {}),
                                                }}
                                            >
                                                <span style={{ fontSize: "24px" }}>{ct.icon}</span>
                                                <span style={{ fontWeight: 600, fontSize: "13px" }}>{ct.label}</span>
                                                <span style={{ fontSize: "11px", color: selected ? "#c4b5fd" : "#475569" }}>{ct.desc}</span>
                                                {selected && (
                                                    <div style={styles.checkmark}>✓</div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {error && <p style={styles.error}>{error}</p>}

                            <button
                                type="submit"
                                className="btn-primary"
                                style={styles.submitBtn}
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

                    {/* Right: Results */}
                    <div style={styles.resultsCol}>
                        {!result && !loading && (
                            <div style={styles.emptyState}>
                                <div style={styles.emptyIcon}>✨</div>
                                <h3 style={styles.emptyTitle}>Your content will appear here</h3>
                                <p style={styles.emptyDesc}>
                                    Fill in the campaign details and click Generate. AI will create
                                    content based on your brand's real social media voice.
                                </p>
                            </div>
                        )}

                        {loading && (
                            <div style={styles.loadingState}>
                                <div style={styles.loadingOrb} />
                                <div className="spinner" style={{ width: "40px", height: "40px", borderWidth: "3px" }} />
                                <p style={{ color: "#94a3b8", marginTop: "20px", fontSize: "15px" }}>
                                    Executing Multi-Agent AI Pipeline...
                                </p>
                                <p style={{ color: "#475569", fontSize: "13px", marginTop: "8px" }}>
                                    This may take 1-2 minutes as 5 specialized AI agents analyze your brand and formulate the brain.
                                </p>
                            </div>
                        )}

                        {result && (
                            <div className="animate-fade-in">
                                {/* Template type badge */}
                                {result.template_type && (
                                    <div style={styles.templateBadge}>
                                        {result.template_type === "educational" && "📚"}
                                        {result.template_type === "problem_solution" && "⚡"}
                                        {result.template_type === "trust_story" && "🤝"}
                                        <span style={{ marginLeft: "6px", textTransform: "capitalize" }}>
                                            {result.template_type.replace("_", "–")}
                                        </span>
                                    </div>
                                )}

                                {/* Canonical post */}
                                {result.canonical_post && (
                                    <ResultCard icon="✍️" title="Canonical Post">
                                        {result.image_url && (
                                            <div style={styles.imagePreviewContainer}>
                                                <img
                                                    src={`${BACKEND_URL}${result.image_url}`}
                                                    alt="AI Generated"
                                                    style={styles.imagePreview}
                                                />
                                            </div>
                                        )}
                                        <p style={styles.captionText}>{result.canonical_post}</p>
                                    </ResultCard>
                                )}

                                {/* Auto-tags */}
                                {result.tags && result.tags.length > 0 && (
                                    <ResultCard icon="🏷️" title="Auto-Tags">
                                        <div style={styles.hashtagGrid}>
                                            {result.tags.map((tag, i) => (
                                                <span key={i} style={styles.hashtag}>#{tag}</span>
                                            ))}
                                        </div>
                                    </ResultCard>
                                )}

                                {/* Tabs */}
                                <div style={styles.tabs}>
                                    {result.ai_brain && (
                                        <button
                                            onClick={() => setActiveTab("ai_brain")}
                                            style={{
                                                ...styles.tab,
                                                ...(activeTab === "ai_brain" ? styles.tabActive : {}),
                                            }}
                                        >
                                            🧠 AI Brain
                                        </button>
                                    )}
                                    {CONTENT_TYPES.filter((ct) => result[ct.id as keyof GeneratedContent]).map((ct) => (
                                        <button
                                            key={ct.id}
                                            onClick={() => setActiveTab(ct.id)}
                                            style={{
                                                ...styles.tab,
                                                ...(activeTab === ct.id ? styles.tabActive : {}),
                                            }}
                                        >
                                            {ct.icon} {ct.label}
                                        </button>
                                    ))}
                                </div>

                                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
                                    <button
                                        onClick={handlePublish}
                                        disabled={publishing}
                                        style={{
                                            ...styles.submitBtn,
                                            width: "auto",
                                            padding: "10px 20px",
                                            display: "flex",
                                            gap: "8px",
                                            alignItems: "center"
                                        }}
                                        className="btn-primary"
                                    >
                                        {publishing ? (
                                            <><div className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} /> Publishing...</>
                                        ) : (
                                            <>🚀 Publish to Telegram</>
                                        )}
                                    </button>
                                </div>

                                {/* AI Brain Tab */}
                                {activeTab === "ai_brain" && result.ai_brain && (
                                    <AiBrainResult data={result.ai_brain} />
                                )}

                                {/* Image Tab */}
                                {activeTab === "image" && result.image && (
                                    <ImageResult data={result.image} />
                                )}

                                {/* Carousel Tab */}
                                {activeTab === "carousel" && result.carousel && (
                                    <CarouselResult data={result.carousel} />
                                )}

                                {/* Video Script Tab */}
                                {activeTab === "video_script" && result.video_script && (
                                    <VideoScriptResult data={result.video_script} />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Result Components ─────────────────────────────────── */

function AiBrainResult({ data }: { data: any }) {
    return (
        <div style={styles.resultContainer}>
            <ResultCard icon="🎯" title="Positioning">
                <p style={styles.captionText}>{data.positioning?.statement || "N/A"}</p>
                <div style={styles.hashtagGrid} className="mt-2">
                    {data.positioning?.taglines?.map((t: string, i: number) => (
                        <span key={i} style={styles.hashtag}>"{t}"</span>
                    ))}
                </div>
            </ResultCard>

            <ResultCard icon="👥" title="Target Audience">
                <div style={{ marginBottom: "16px" }}>
                    <strong style={{ color: "#f8fafc" }}>Primary:</strong> <span style={styles.bodyText}>{data.target_users?.primary?.profile || "N/A"}</span>
                </div>
                <div>
                    <strong style={{ color: "#f8fafc" }}>Secondary:</strong> <span style={styles.bodyText}>{data.target_users?.secondary?.profile || "N/A"}</span>
                </div>
            </ResultCard>

            <ResultCard icon="⚔️" title="Competition & Alternatives">
                <div style={{ marginBottom: "16px" }}>
                    <strong style={{ color: "#f8fafc" }}>Competitors:</strong> <span style={styles.bodyText}>{(data.competitors || []).join(", ") || "N/A"}</span>
                </div>
                <div style={{ marginBottom: "16px" }}>
                    <strong style={{ color: "#f8fafc" }}>Alternatives:</strong> <span style={styles.bodyText}>{data.alternative_product || "N/A"}</span>
                </div>
                <div>
                    <strong style={{ color: "#f8fafc" }}>Advantages:</strong> <span style={styles.bodyText}>{data.advantages || "N/A"}</span>
                </div>
            </ResultCard>

            <ResultCard icon="💡" title="Use Cases">
                {data.use_cases && data.use_cases.length > 0 ? data.use_cases.map((uc: any, i: number) => (
                    <div key={i} style={{ marginBottom: "12px" }}>
                        <strong style={{ color: "#f8fafc" }}>{uc.title}:</strong> <span style={styles.bodyText}>{uc.description}</span>
                    </div>
                )) : <span style={styles.bodyText}>N/A</span>}
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
        <div style={styles.resultContainer}>
            <ResultCard icon="📝" title="Caption">
                <p style={styles.captionText}>{data.caption}</p>
            </ResultCard>

            <ResultCard icon="🎨" title="Visual Direction">
                <p style={styles.bodyText}>{data.visual_description}</p>
            </ResultCard>

            {data.hashtags && data.hashtags.length > 0 && (
                <ResultCard icon="#️⃣" title="Hashtags">
                    <div style={styles.hashtagGrid}>
                        {data.hashtags.map((tag, i) => (
                            <span key={i} style={styles.hashtag}>
                                {tag.startsWith("#") ? tag : `#${tag}`}
                            </span>
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
        <div style={styles.resultContainer}>
            <ResultCard icon="📌" title={data.title}>
                <div style={styles.slideNav}>
                    {allSlides.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveSlide(i)}
                            style={{
                                ...styles.slideDot,
                                ...(activeSlide === i ? styles.slideDotActive : {}),
                            }}
                        >
                            {i === allSlides.length - 1 ? "CTA" : i + 1}
                        </button>
                    ))}
                </div>

                <div className="glass-card" style={styles.slideCard}>
                    <div style={styles.slideNumber}>
                        {activeSlide === allSlides.length - 1 ? "CTA Slide" : `Slide ${activeSlide + 1}`}
                    </div>

                    {allSlides[activeSlide].image_url && (
                        <div style={styles.slideImageContainer}>
                            <img
                                src={`${BACKEND_URL}${allSlides[activeSlide].image_url}`}
                                alt={`Slide ${activeSlide + 1}`}
                                style={styles.slideImage}
                            />
                        </div>
                    )}

                    <h3 style={styles.slideTitle}>{allSlides[activeSlide].title}</h3>
                    <p style={styles.bodyText}>{allSlides[activeSlide].body}</p>
                </div>

                <div style={styles.slideProgress}>
                    {activeSlide + 1} / {allSlides.length}
                </div>
            </ResultCard>
        </div>
    );
}

function VideoScriptResult({ data }: { data: VideoScript }) {
    return (
        <div style={styles.resultContainer}>
            <ResultCard icon="🎣" title="Hook (0–3 seconds)">
                <p style={styles.captionText}>{data.hook}</p>
            </ResultCard>

            <ResultCard icon="▶️" title="Main Script">
                <p style={styles.bodyText}>{data.body}</p>
            </ResultCard>

            <ResultCard icon="📣" title="Call to Action">
                <p style={styles.captionText}>{data.cta}</p>
            </ResultCard>

            {data.caption && (
                <ResultCard icon="💬" title="Video Caption">
                    <p style={styles.bodyText}>{data.caption}</p>
                </ResultCard>
            )}
        </div>
    );
}

function ResultCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
    return (
        <div className="glass-card" style={styles.resultCard}>
            <div style={styles.resultCardHeader}>
                <span style={{ fontSize: "18px" }}>{icon}</span>
                <span style={styles.resultCardTitle}>{title}</span>
            </div>
            <div style={styles.resultCardBody}>{children}</div>
        </div>
    );
}

/* ─── Styles ─────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100vh",
        padding: "0 20px 60px",
        position: "relative",
        overflow: "hidden",
    },
    orb1: {
        position: "fixed",
        top: "-10%",
        right: "-5%",
        width: "500px",
        height: "500px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(124, 58, 237, 0.12) 0%, transparent 70%)",
        pointerEvents: "none",
    },
    orb2: {
        position: "fixed",
        bottom: "-10%",
        left: "-5%",
        width: "400px",
        height: "400px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)",
        pointerEvents: "none",
    },
    container: {
        maxWidth: "1280px",
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
    },
    nav: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "24px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        marginBottom: "40px",
    },
    backBtn: {
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#94a3b8",
        padding: "8px 16px",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
        transition: "all 0.2s",
    },
    navBrand: {},
    companyBadge: {
        padding: "6px 14px",
        background: "rgba(124, 58, 237, 0.1)",
        border: "1px solid rgba(124, 58, 237, 0.2)",
        borderRadius: "100px",
        fontSize: "13px",
    },
    layout: {
        display: "grid",
        gridTemplateColumns: "420px 1fr",
        gap: "40px",
        alignItems: "start",
    },
    formCol: {
        position: "sticky",
        top: "20px",
    },
    formHeader: {
        marginBottom: "28px",
    },
    title: {
        fontSize: "32px",
        fontWeight: 800,
        letterSpacing: "-0.02em",
        marginBottom: "8px",
    },
    subtitle: {
        color: "#64748b",
        fontSize: "14px",
        lineHeight: 1.6,
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    fieldGroup: {
        display: "flex",
        flexDirection: "column",
    },
    toneGrid: {
        display: "flex",
        flexWrap: "wrap" as const,
        gap: "8px",
    },
    toneBtn: {
        padding: "8px 16px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "100px",
        color: "#94a3b8",
        fontSize: "13px",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.2s",
    },
    toneBtnActive: {
        background: "rgba(124, 58, 237, 0.2)",
        border: "1px solid rgba(124, 58, 237, 0.4)",
        color: "#c4b5fd",
    },
    templateGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "10px",
        marginTop: "8px",
    },
    templateBtn: {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        gap: "5px",
        padding: "14px 8px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "12px",
        color: "#64748b",
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative" as const,
        textAlign: "center" as const,
    },
    contentTypeGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "10px",
    },
    contentTypeBtn: {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        gap: "6px",
        padding: "16px 10px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "12px",
        color: "#94a3b8",
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative" as const,
        textAlign: "center" as const,
    },
    contentTypeBtnActive: {
        background: "rgba(124, 58, 237, 0.15)",
        border: "1px solid rgba(124, 58, 237, 0.4)",
        color: "#f8fafc",
    },
    checkmark: {
        position: "absolute" as const,
        top: "8px",
        right: "8px",
        width: "18px",
        height: "18px",
        background: "#7c3aed",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "10px",
        color: "white",
        fontWeight: 700,
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
        fontSize: "15px",
    },
    resultsCol: {
        minHeight: "500px",
    },
    emptyState: {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        minHeight: "500px",
        textAlign: "center" as const,
        padding: "60px 40px",
        background: "rgba(255,255,255,0.02)",
        border: "1px dashed rgba(255,255,255,0.08)",
        borderRadius: "20px",
    },
    emptyIcon: {
        fontSize: "48px",
        marginBottom: "20px",
        opacity: 0.5,
    },
    emptyTitle: {
        fontSize: "20px",
        fontWeight: 600,
        color: "#475569",
        marginBottom: "12px",
    },
    emptyDesc: {
        color: "#334155",
        fontSize: "14px",
        lineHeight: 1.7,
        maxWidth: "320px",
    },
    loadingState: {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        minHeight: "500px",
        position: "relative" as const,
    },
    loadingOrb: {
        position: "absolute" as const,
        width: "300px",
        height: "300px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, transparent 70%)",
        animation: "pulse-glow 2s ease-in-out infinite",
    },
    tabs: {
        display: "flex",
        gap: "8px",
        marginBottom: "24px",
        flexWrap: "wrap" as const,
    },
    tab: {
        padding: "10px 20px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "100px",
        color: "#64748b",
        fontSize: "14px",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.2s",
    },
    tabActive: {
        background: "rgba(124, 58, 237, 0.2)",
        border: "1px solid rgba(124, 58, 237, 0.4)",
        color: "#c4b5fd",
    },
    resultContainer: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "16px",
    },
    resultCard: {
        padding: "20px 24px",
    },
    resultCardHeader: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "14px",
        paddingBottom: "12px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
    },
    resultCardTitle: {
        fontSize: "14px",
        fontWeight: 600,
        color: "#94a3b8",
        textTransform: "uppercase" as const,
        letterSpacing: "0.06em",
    },
    resultCardBody: {},
    captionText: {
        fontSize: "16px",
        lineHeight: 1.7,
        color: "#f1f5f9",
        fontWeight: 400,
    },
    bodyText: {
        fontSize: "14px",
        lineHeight: 1.7,
        color: "#94a3b8",
    },
    hashtagGrid: {
        display: "flex",
        flexWrap: "wrap" as const,
        gap: "8px",
    },
    hashtag: {
        padding: "4px 12px",
        background: "rgba(124, 58, 237, 0.12)",
        border: "1px solid rgba(124, 58, 237, 0.25)",
        borderRadius: "100px",
        fontSize: "13px",
        color: "#a78bfa",
        fontWeight: 500,
    },
    slideNav: {
        display: "flex",
        gap: "8px",
        marginBottom: "16px",
        flexWrap: "wrap" as const,
    },
    slideDot: {
        width: "36px",
        height: "36px",
        borderRadius: "8px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "#64748b",
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s",
    },
    slideDotActive: {
        background: "rgba(124, 58, 237, 0.2)",
        border: "1px solid rgba(124, 58, 237, 0.4)",
        color: "#c4b5fd",
    },
    slideCard: {
        padding: "24px",
        minHeight: "160px",
    },
    slideNumber: {
        fontSize: "11px",
        fontWeight: 600,
        color: "#7c3aed",
        textTransform: "uppercase" as const,
        letterSpacing: "0.08em",
        marginBottom: "10px",
    },
    slideTitle: {
        fontSize: "20px",
        fontWeight: 700,
        color: "#f8fafc",
        marginBottom: "12px",
        lineHeight: 1.3,
    },
    slideProgress: {
        textAlign: "center" as const,
        fontSize: "12px",
        color: "#475569",
        marginTop: "12px",
    },
    durationBadge: {
        display: "inline-block",
        padding: "6px 14px",
        background: "rgba(6, 182, 212, 0.1)",
        border: "1px solid rgba(6, 182, 212, 0.25)",
        borderRadius: "100px",
        fontSize: "12px",
        color: "#22d3ee",
        fontWeight: 600,
        marginBottom: "4px",
    },
    visualNote: {
        marginTop: "10px",
        padding: "10px 14px",
        background: "rgba(255,255,255,0.03)",
        borderRadius: "8px",
        fontSize: "13px",
        color: "#64748b",
        lineHeight: 1.5,
    },
    visualNoteLabel: {
        fontWeight: 600,
        color: "#475569",
    },
    templateBadge: {
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
        textTransform: "capitalize" as const,
    },
    imagePreviewContainer: {
        width: "100%",
        borderRadius: "12px",
        overflow: "hidden",
        marginBottom: "16px",
        background: "rgba(0,0,0,0.2)",
        aspectRatio: "1 / 1",
    },
    imagePreview: {
        width: "100%",
        height: "100%",
        objectFit: "cover" as const,
    },
    slideImageContainer: {
        width: "100%",
        borderRadius: "12px",
        overflow: "hidden",
        marginBottom: "16px",
        background: "rgba(0,0,0,0.2)",
        aspectRatio: "16 / 9",
    },
    slideImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover" as const,
    },
};

export default function CampaignPage() {
    return (
        <Suspense fallback={<div style={{ color: "#94a3b8", padding: "40px", textAlign: "center" }}>Loading...</div>}>
            <CampaignPageInner />
        </Suspense>
    );
}
