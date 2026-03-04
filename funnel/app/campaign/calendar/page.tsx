"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// Reuse similar types
type ImageContent = { caption: string; visual_description: string; hashtags: string[]; image_url?: string };
type CarouselSlide = { slide_number: number; title: string; body: string; image_url?: string };
type CarouselContent = { title: string; slides: CarouselSlide[]; cta_slide: { title: string; body: string; image_url?: string } };
type VideoScript = { hook: string; body: string; cta: string; caption: string };

type DayContent = {
    day: number;
    content_type: string;
    canonical_post?: string;
    visual_direction?: string;
    carousel?: CarouselContent;
    video_script?: VideoScript;
    tags?: string[];
    image_url?: string;
    video_url?: string;
    error?: string;
};

type GeneratedCalendar = {
    template_type: string;
    total_days: number;
    days: DayContent[];
};

type Campaign = {
    id: number;
    company_name: string;
    description: string;
    status: string;
    generated_content: GeneratedCalendar;
};

const BACKEND_URL = "http://localhost:8000";

function CalendarPageInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const campaignId = searchParams.get("id");

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedDay, setSelectedDay] = useState<DayContent | null>(null);
    const [publishing, setPublishing] = useState(false);

    useEffect(() => {
        if (!campaignId) {
            setError("No campaign ID provided.");
            setLoading(false);
            return;
        }

        const fetchCampaign = async () => {
            try {
                const res = await fetch(`http://localhost:8000/campaign/${campaignId}`);
                if (!res.ok) throw new Error("Failed to fetch campaign");
                const data = await res.json();

                if (data.success && data.campaign) {
                    setCampaign(data.campaign);
                    // Select day 1 by default if available
                    if (data.campaign.generated_content?.days?.length > 0) {
                        setSelectedDay(data.campaign.generated_content.days[0]);
                    }
                } else {
                    setError("Campaign not found");
                }
            } catch (err) {
                setError("Could not connect to backend to fetch calendar data.");
            } finally {
                setLoading(false);
            }
        };

        fetchCampaign();
    }, [campaignId]);

    const handlePublish = async () => {
        if (!selectedDay || !campaign) return;
        setPublishing(true);
        try {
            let contentType = selectedDay.content_type;
            if (contentType === "image") contentType = "canonical";

            // Reformat as expected by the publish endpoint
            const payloadData = JSON.parse(JSON.stringify(selectedDay));
            payloadData.template_type = campaign.generated_content.template_type;

            // Format full image URLs if present
            if (payloadData.image_url && !payloadData.image_url.startsWith("http")) {
                payloadData.image_url = `${BACKEND_URL}${payloadData.image_url}`;
            }
            if (payloadData.video_url && !payloadData.video_url.startsWith("http")) {
                payloadData.video_url = `${BACKEND_URL}${payloadData.video_url}`;
            }
            if (payloadData.carousel && payloadData.carousel.slides) {
                payloadData.carousel.slides.forEach((s: any) => {
                    if (s.image_url && !s.image_url.startsWith("http")) s.image_url = `${BACKEND_URL}${s.image_url}`;
                });
                if (payloadData.carousel.cta_slide && payloadData.carousel.cta_slide.image_url && !payloadData.carousel.cta_slide.image_url.startsWith("http")) {
                    payloadData.carousel.cta_slide.image_url = `${BACKEND_URL}${payloadData.carousel.cta_slide.image_url}`;
                }
            }

            const res = await fetch("http://localhost:8000/publish/telegram", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content_type: contentType,
                    data: payloadData,
                }),
            });
            const data = await res.json();
            if (data.success) {
                alert(`Day ${selectedDay.day} published to Telegram! 🚀`);
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

    const getContentTypeIcon = (type: string) => {
        if (type === "canonical_post" || type === "image") return "📝";
        if (type === "carousel") return "🖼️";
        if (type === "video_script") return "🎞️";
        return "❓";
    };

    const getContentTypeColor = (type: string) => {
        if (type === "canonical_post" || type === "image") return "rgba(59, 130, 246, 0.2)";
        if (type === "carousel") return "rgba(16, 185, 129, 0.2)";
        if (type === "video_script") return "rgba(245, 158, 11, 0.2)";
        return "rgba(255, 255, 255, 0.1)";
    };

    const getContentTypeBorder = (type: string) => {
        if (type === "canonical_post" || type === "image") return "rgba(59, 130, 246, 0.4)";
        if (type === "carousel") return "rgba(16, 185, 129, 0.4)";
        if (type === "video_script") return "rgba(245, 158, 11, 0.4)";
        return "rgba(255, 255, 255, 0.2)";
    };

    if (loading) {
        return (
            <div style={styles.page}>
                <div style={styles.container}>
                    <div style={{ textAlign: "center", marginTop: "20vh" }}>
                        <div className="spinner" style={{ width: "50px", height: "50px", borderWidth: "4px" }} />
                        <h2 style={{ color: "white", marginTop: "20px" }}>Loading 30-Day Calendar...</h2>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !campaign) {
        return (
            <div style={styles.page}>
                <div style={styles.container}>
                    <div style={{ textAlign: "center", marginTop: "20vh" }}>
                        <h2 style={{ color: "#f87171" }}>Error</h2>
                        <p style={{ color: "#94a3b8", marginTop: "10px" }}>{error}</p>
                        <button onClick={() => router.push("/")} style={styles.backBtn}>Back to Home</button>
                    </div>
                </div>
            </div>
        );
    }

    const { days } = campaign.generated_content;
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Create empty slots to simulate a real calendar month starting on a Tuesday (example offset)
    const startingDayOffset = 2; // e.g. Month starts on Tuesday
    const emptySlots = Array(startingDayOffset).fill(null);
    const calendarGrid = [...emptySlots, ...(days || [])];

    return (
        <div style={styles.page}>
            <div style={styles.orb1} />
            <div style={styles.orb2} />

            <div style={styles.container}>
                {/* Top nav */}
                <div style={styles.nav}>
                    <button onClick={() => router.push("/campaign")} style={styles.backBtn}>
                        ← Back to Create
                    </button>
                    <div style={styles.navBrand}>
                        <span className="gradient-text" style={{ fontWeight: 700, fontSize: "20px" }}>30-Day Content Calendar</span>
                    </div>
                    <div style={styles.companyBadge}>
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>Brand:</span>
                        <span style={{ fontWeight: 600, color: "#f8fafc", marginLeft: "6px" }}>{campaign.company_name}</span>
                    </div>
                </div>

                <div style={styles.layout}>
                    {/* Left: The Actual Calendar Grid */}
                    <div style={styles.calendarCol}>
                        <div style={styles.calendarHeader}>
                            <h2 style={{ color: "white", margin: 0 }}>Content Plan</h2>
                            <span style={{ color: "#94a3b8", fontSize: "14px" }}>{days.length} Days Generated</span>
                        </div>

                        <div className="glass-card" style={styles.calendarContainer}>
                            <div style={styles.weekdayRow}>
                                {weekdays.map(day => (
                                    <div key={day} style={styles.weekdayLabel}>{day}</div>
                                ))}
                            </div>

                            <div style={styles.dayGrid}>
                                {calendarGrid.map((dayData, index) => {
                                    if (!dayData) {
                                        return <div key={`empty-${index}`} style={styles.emptyDayCell} />;
                                    }

                                    const isSelected = selectedDay?.day === dayData.day;
                                    const cType = dayData.content_type;
                                    const hasError = !!dayData.error;

                                    return (
                                        <button
                                            key={dayData.day}
                                            onClick={() => setSelectedDay(dayData)}
                                            style={{
                                                ...styles.dayCell,
                                                ...(isSelected ? styles.dayCellSelected : {}),
                                                ...(hasError ? { border: "1px solid #f87171", background: "rgba(248, 113, 113, 0.1)" } : {
                                                    background: isSelected ? getContentTypeColor(cType) : "rgba(255,255,255,0.03)",
                                                    border: `1px solid ${isSelected ? getContentTypeBorder(cType) : "rgba(255,255,255,0.08)"}`
                                                })
                                            }}
                                        >
                                            <div style={styles.dayNumber}>{dayData.day}</div>
                                            <div style={styles.dayIcon}>
                                                {hasError ? "⚠️" : getContentTypeIcon(cType)}
                                            </div>
                                            <div style={styles.dayLabel}>
                                                {hasError ? "Failed" : cType.replace("_", " ")}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right: Selected Day Details */}
                    <div style={styles.detailsCol}>
                        {selectedDay ? (
                            <div className="animate-fade-in" style={{ position: "sticky", top: "20px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                    <h2 style={{ color: "white", margin: 0 }}>
                                        Day {selectedDay.day}
                                        <span style={{ color: "#94a3b8", fontSize: "14px", fontWeight: "normal", marginLeft: "10px" }}>
                                            — {selectedDay.content_type.replace("_", " ").toUpperCase()}
                                        </span>
                                    </h2>
                                    <button
                                        onClick={handlePublish}
                                        disabled={publishing || !!selectedDay.error}
                                        style={{
                                            ...styles.submitBtn,
                                            width: "auto",
                                            padding: "8px 16px",
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

                                {selectedDay.error ? (
                                    <div style={styles.errorCard}>
                                        <h3>Generation Failed</h3>
                                        <p>{selectedDay.error}</p>
                                    </div>
                                ) : (
                                    <>
                                        {(selectedDay.content_type === "canonical_post" || selectedDay.content_type === "image") && selectedDay.image_url && (
                                            <ResultCard icon="🖼️" title="AI Generated Image">
                                                <div style={{ width: "100%", borderRadius: "12px", overflow: "hidden", background: "rgba(0,0,0,0.2)", aspectRatio: "1 / 1" }}>
                                                    <img src={`${BACKEND_URL}${selectedDay.image_url}`} alt="AI Generated" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                </div>
                                            </ResultCard>
                                        )}

                                        {selectedDay.content_type === "video_script" && selectedDay.video_url && (
                                            <ResultCard icon="🎥" title="AI Generated Video">
                                                <div style={{ width: "100%", borderRadius: "12px", overflow: "hidden", background: "rgba(0,0,0,0.2)", display: "flex", justifyContent: "center", alignItems: "center" }}>
                                                    <video src={`${BACKEND_URL}${selectedDay.video_url}`} controls autoPlay loop playsInline style={{ width: "100%", maxHeight: "600px", objectFit: "contain", borderRadius: "12px" }} />
                                                </div>
                                            </ResultCard>
                                        )}

                                        {(selectedDay.content_type === "canonical_post" || selectedDay.content_type === "image") && selectedDay.canonical_post && (
                                            <ResultCard icon="📝" title="Canonical Post">
                                                <p style={styles.captionText}>{selectedDay.canonical_post}</p>
                                            </ResultCard>
                                        )}

                                        {(selectedDay.content_type === "canonical_post" || selectedDay.content_type === "image") && selectedDay.visual_direction && (
                                            <ResultCard icon="🎨" title="Visual Direction">
                                                <p style={styles.bodyText}>{selectedDay.visual_direction}</p>
                                            </ResultCard>
                                        )}

                                        {selectedDay.content_type === "carousel" && selectedDay.carousel && (
                                            <CarouselResult data={selectedDay.carousel} />
                                        )}

                                        {selectedDay.content_type === "video_script" && selectedDay.video_script && (
                                            <VideoScriptResult data={selectedDay.video_script} />
                                        )}

                                        {selectedDay.tags && selectedDay.tags.length > 0 && (
                                            <ResultCard icon="🏷️" title="Suggested Tags">
                                                <div style={styles.hashtagGrid}>
                                                    {selectedDay.tags.map((tag, i) => (
                                                        <span key={i} style={styles.hashtag}>#{tag.replace(/^#+/, '')}</span>
                                                    ))}
                                                </div>
                                            </ResultCard>
                                        )}
                                    </>
                                )}
                            </div>
                        ) : (
                            <div style={styles.emptyState}>
                                <div style={styles.emptyIcon}>📅</div>
                                <h3 style={styles.emptyTitle}>Select a Day</h3>
                                <p style={styles.emptyDesc}>Click on any day in the calendar grid to view and publish its generated content.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CalendarPage() {
    return (
        <Suspense fallback={<div style={{ padding: "50px", textAlign: "center", color: "white" }}>Loading...</div>}>
            <CalendarPageInner />
        </Suspense>
    );
}

/* ─── Result Components (Reused) ─────────────────────────────────── */

function CarouselResult({ data }: { data: CarouselContent }) {
    const [activeSlide, setActiveSlide] = useState(0);
    const allSlides = [...data.slides];
    if (data.cta_slide) {
        allSlides.push({ slide_number: data.slides.length + 1, title: data.cta_slide.title, body: data.cta_slide.body });
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <ResultCard icon="📌" title={data.title || "Carousel Concept"}>
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

                    <h3 style={styles.slideTitle}>{allSlides[activeSlide].title}</h3>
                    <p style={styles.bodyText}>{allSlides[activeSlide].body}</p>
                    {allSlides[activeSlide].image_url && (
                        <div style={{ marginTop: "15px", padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: "8px" }}>
                            <img src={`${BACKEND_URL}${allSlides[activeSlide].image_url}`} style={{ width: "100%", borderRadius: "6px" }} />
                        </div>
                    )}
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
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
        background: "radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
    },
    orb2: {
        position: "fixed",
        bottom: "-10%",
        left: "-5%",
        width: "400px",
        height: "400px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
    },
    container: {
        maxWidth: "1400px",
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
    companyBadge: {
        padding: "6px 14px",
        background: "rgba(124, 58, 237, 0.1)",
        border: "1px solid rgba(124, 58, 237, 0.2)",
        borderRadius: "100px",
        fontSize: "13px",
    },
    layout: {
        display: "grid",
        gridTemplateColumns: "1fr 450px", // Calendar is flexible, details panel is fixed 450px
        gap: "40px",
        alignItems: "start",
    },
    calendarCol: {
        display: "flex",
        flexDirection: "column",
    },
    calendarHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: "20px",
    },
    calendarContainer: {
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    weekdayRow: {
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: "10px",
        textAlign: "center",
        paddingBottom: "10px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
    },
    weekdayLabel: {
        color: "#94a3b8",
        fontWeight: 600,
        fontSize: "13px",
        textTransform: "uppercase",
        letterSpacing: "1px",
    },
    dayGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: "10px",
    },
    emptyDayCell: {
        minHeight: "100px",
        background: "transparent",
        border: "1px dashed rgba(255,255,255,0.05)",
        borderRadius: "12px",
    },
    dayCell: {
        minHeight: "100px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px",
        borderRadius: "12px",
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
    },
    dayCellSelected: {
        transform: "scale(1.05)",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
        zIndex: 10,
    },
    dayNumber: {
        position: "absolute",
        top: "8px",
        left: "10px",
        fontSize: "12px",
        fontWeight: 700,
        color: "#94a3b8",
    },
    dayIcon: {
        fontSize: "24px",
        marginBottom: "4px",
    },
    dayLabel: {
        fontSize: "11px",
        color: "#cbd5e1",
        fontWeight: 500,
        textTransform: "capitalize",
        textAlign: "center",
    },
    detailsCol: {
        minHeight: "600px",
    },
    emptyState: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        textAlign: "center",
        background: "rgba(255,255,255,0.02)",
        border: "1px dashed rgba(255,255,255,0.1)",
        borderRadius: "24px",
        padding: "40px",
    },
    emptyIcon: {
        fontSize: "48px",
        marginBottom: "16px",
        opacity: 0.8,
    },
    emptyTitle: {
        color: "#f8fafc",
        fontSize: "20px",
        fontWeight: 600,
        marginBottom: "8px",
    },
    emptyDesc: {
        color: "#94a3b8",
        fontSize: "14px",
        lineHeight: 1.6,
        maxWidth: "280px",
    },
    resultCard: {
        padding: "20px",
        marginBottom: "16px",
    },
    resultCardHeader: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "16px",
        paddingBottom: "12px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
    },
    resultCardTitle: {
        fontSize: "15px",
        fontWeight: 600,
        color: "#f8fafc",
    },
    resultCardBody: {},
    captionText: {
        color: "#cbd5e1",
        fontSize: "15px",
        lineHeight: 1.7,
        whiteSpace: "pre-wrap",
    },
    bodyText: {
        color: "#94a3b8",
        fontSize: "14px",
        lineHeight: 1.6,
    },
    hashtagGrid: {
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
    },
    hashtag: {
        fontSize: "13px",
        color: "#6ee7b7",
        background: "rgba(16, 185, 129, 0.1)",
        padding: "4px 10px",
        borderRadius: "100px",
    },
    slideNav: {
        display: "flex",
        gap: "6px",
        marginBottom: "16px",
        overflowX: "auto",
        paddingBottom: "8px",
    },
    slideDot: {
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#94a3b8",
        padding: "4px 12px",
        borderRadius: "100px",
        fontSize: "12px",
        cursor: "pointer",
        whiteSpace: "nowrap",
    },
    slideDotActive: {
        background: "rgba(59, 130, 246, 0.2)",
        border: "1px solid rgba(59, 130, 246, 0.5)",
        color: "#60a5fa",
        fontWeight: 600,
    },
    slideCard: {
        padding: "20px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
    },
    slideNumber: {
        fontSize: "11px",
        textTransform: "uppercase",
        letterSpacing: "1px",
        color: "#60a5fa",
        fontWeight: 700,
        marginBottom: "12px",
    },
    slideTitle: {
        fontSize: "18px",
        fontWeight: 600,
        color: "#f8fafc",
        marginBottom: "8px",
    },
    slideProgress: {
        textAlign: "center",
        fontSize: "12px",
        color: "#64748b",
        marginTop: "16px",
    },
    submitBtn: {
        background: "linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)",
        border: "none",
        color: "white",
        fontWeight: 600,
        borderRadius: "12px",
        cursor: "pointer",
        transition: "all 0.2s",
        fontSize: "14px",
    },
    errorCard: {
        padding: "24px",
        background: "rgba(248, 113, 113, 0.15)",
        border: "1px solid rgba(248, 113, 113, 0.4)",
        borderRadius: "16px",
        color: "#f87171",
        textAlign: "center",
    }
};
