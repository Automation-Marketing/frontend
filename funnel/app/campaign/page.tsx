"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const BACKEND_URL = "http://localhost:8000";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

type DayContent = {
    day: number;
    content_type: string;
    canonical_post?: string;
    visual_direction?: string;
    carousel?: any;
    video_script?: any;
    tags?: string[];
    image_url?: string;
    error?: string;
};

type Campaign = {
    id: number;
    company_name: string;
    description: string;
    product_service: string;
    status: string;
    generated_content: {
        template_type: string;
        total_days: number;
        days: DayContent[];
    };
    created_at: string;
};

function DashboardInner() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const brandId = searchParams.get("brand_id");
    const companyName = searchParams.get("company") || "";
    const campaignId = searchParams.get("campaign_id");

    const now = new Date();
    const [currentMonth, setCurrentMonth] = useState(now.getMonth());
    const [currentYear, setCurrentYear] = useState(now.getFullYear());
    const [selectedDate, setSelectedDate] = useState(now);
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [selectedDayContent, setSelectedDayContent] = useState<DayContent | null>(null);
    const [publishing, setPublishing] = useState(false);

    useEffect(() => {
        if (!campaignId) return;
        const fetchCampaign = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/campaign/${campaignId}`);
                if (!res.ok) return;
                const data = await res.json();
                if (data.success && data.campaign) {
                    setCampaign(data.campaign);
                }
            } catch (e) {
                console.error("Failed to fetch campaign:", e);
            }
        };
        fetchCampaign();
    }, [campaignId]);

    const prevMonth = () => {
        if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
        else { setCurrentMonth(currentMonth - 1); }
    };
    const nextMonth = () => {
        if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
        else { setCurrentMonth(currentMonth + 1); }
    };
    const prevYear = () => setCurrentYear(currentYear - 1);
    const nextYear = () => setCurrentYear(currentYear + 1);

    const getCampaignDateMap = (): Map<string, DayContent> => {
        const map = new Map<string, DayContent>();
        if (!campaign?.generated_content?.days) return map;
        const startDate = campaign.created_at ? new Date(campaign.created_at) : now;
        campaign.generated_content.days.forEach((dayContent) => {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + (dayContent.day - 1));
            const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            map.set(key, dayContent);
        });
        return map;
    };

    const campaignDateMap = getCampaignDateMap();

    const getCalendarDays = () => {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        let startDayOfWeek = firstDay.getDay() - 1;
        if (startDayOfWeek < 0) startDayOfWeek = 6;
        const daysInMonth = lastDay.getDate();
        const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
        const days: { day: number; isCurrentMonth: boolean; isToday: boolean; isWeekend: boolean; date: Date }[] = [];

        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const d = prevMonthLastDay - i;
            days.push({ day: d, isCurrentMonth: false, isToday: false, isWeekend: false, date: new Date(currentYear, currentMonth - 1, d) });
        }
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(currentYear, currentMonth, i);
            const dayOfWeek = date.getDay();
            days.push({
                day: i, isCurrentMonth: true,
                isToday: i === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear(),
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6, date,
            });
        }
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ day: i, isCurrentMonth: false, isToday: false, isWeekend: false, date: new Date(currentYear, currentMonth + 1, i) });
        }
        return days;
    };

    const calendarDays = getCalendarDays();

    const formatSelectedDate = (date: Date) => {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${days[date.getDay()]} ${months[date.getMonth()]} ${String(date.getDate()).padStart(2, "0")} ${date.getFullYear()}`;
    };

    const getDateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

    const getContentTypeIcon = (type: string) => {
        if (type === "canonical_post" || type === "image") return "📝";
        if (type === "carousel") return "🖼️";
        if (type === "video_script") return "🎞️";
        return "📄";
    };

    const getContentTypeColor = (type: string) => {
        if (type === "canonical_post" || type === "image") return "rgba(59, 130, 246, 0.25)";
        if (type === "carousel") return "rgba(16, 185, 129, 0.25)";
        if (type === "video_script") return "rgba(245, 158, 11, 0.25)";
        return "rgba(124, 58, 237, 0.25)";
    };

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
        const key = getDateKey(date);
        const content = campaignDateMap.get(key);
        setSelectedDayContent(content || null);
    };

    const totalCampaigns = campaign ? 1 : 0;
    const campaignsOnDate = selectedDayContent ? 1 : 0;

    const handlePublish = async () => {
        if (!selectedDayContent || !campaign) return;
        setPublishing(true);
        try {
            let contentType = selectedDayContent.content_type;
            if (contentType === "image") contentType = "canonical";
            const payloadData = JSON.parse(JSON.stringify(selectedDayContent));
            payloadData.template_type = campaign.generated_content.template_type;
            if (payloadData.image_url && !payloadData.image_url.startsWith("http")) {
                payloadData.image_url = `${BACKEND_URL}${payloadData.image_url}`;
            }
            const res = await fetch(`${BACKEND_URL}/publish/telegram`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content_type: contentType, data: payloadData }),
            });
            const data = await res.json();
            if (data.success) {
                alert(`Day ${selectedDayContent.day} published to Telegram! 🚀`);
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
                <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "32px", textAlign: "center" }}>
                    Campaign Planner
                </h1>

                {/* Top row: Calendar + Date/Stats side by side */}
                <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 550px) 1fr", gap: "36px", alignItems: "start" }}>
                    {/* Left: Calendar */}
                    <div className="calendar-container" style={{ padding: "16px" }}>
                        <div className="calendar-header">
                            <div style={{ display: "flex", gap: "8px" }}>
                                <button className="calendar-nav-btn" onClick={prevYear}>«</button>
                                <button className="calendar-nav-btn" onClick={prevMonth}>‹</button>
                            </div>
                            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
                                {MONTH_NAMES[currentMonth]} {currentYear}
                            </h2>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <button className="calendar-nav-btn" onClick={nextMonth}>›</button>
                                <button className="calendar-nav-btn" onClick={nextYear}>»</button>
                            </div>
                        </div>
                        <div className="calendar-weekday-row">
                            {WEEKDAYS.map((day) => (
                                <div key={day} className="calendar-weekday">{day}</div>
                            ))}
                        </div>
                        <div className="calendar-grid">
                            {calendarDays.map((dayInfo, i) => {
                                const isSelected =
                                    selectedDate.getDate() === dayInfo.date.getDate() &&
                                    selectedDate.getMonth() === dayInfo.date.getMonth() &&
                                    selectedDate.getFullYear() === dayInfo.date.getFullYear();
                                const dateKey = getDateKey(dayInfo.date);
                                const hasCampaignContent = campaignDateMap.has(dateKey);
                                const contentData = campaignDateMap.get(dateKey);
                                let className = "calendar-day";
                                if (!dayInfo.isCurrentMonth) className += " other-month";
                                if (dayInfo.isToday) className += " today";
                                if (dayInfo.isWeekend && dayInfo.isCurrentMonth) className += " weekend";
                                if (hasCampaignContent) className += " has-campaign";
                                const style: React.CSSProperties = {};
                                if (isSelected) {
                                    style.background = "rgba(124, 58, 237, 0.3)";
                                    style.color = "#fff";
                                    style.fontWeight = 700;
                                    style.border = "1px solid rgba(124, 58, 237, 0.5)";
                                } else if (hasCampaignContent && contentData) {
                                    style.background = getContentTypeColor(contentData.content_type);
                                    style.fontWeight = 600;
                                }
                                return (
                                    <button key={i} className={className} onClick={() => handleDateClick(dayInfo.date)} style={style}
                                        title={hasCampaignContent && contentData ? `Day ${contentData.day}: ${contentData.content_type.replace("_", " ")}` : undefined}>
                                        <span>{dayInfo.day}</span>
                                        {hasCampaignContent && contentData && (
                                            <span style={{ position: "absolute", bottom: "2px", fontSize: "10px" }}>
                                                {getContentTypeIcon(contentData.content_type)}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Selected day content */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
                        {selectedDayContent ? (
                            <div className="glass-card animate-fade-in" style={{ padding: "20px", overflow: "hidden" }}>
                                {selectedDayContent.error ? (
                                    <div style={{ textAlign: "center", color: "#f87171", padding: "20px 0" }}>
                                        <h4 style={{ marginBottom: "8px" }}>Generation Failed</h4>
                                        <p style={{ fontSize: "14px" }}>{selectedDayContent.error}</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Day title + publish */}
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--glass-border)" }}>
                                            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                                                <span>{getContentTypeIcon(selectedDayContent.content_type)}</span>
                                                Day {selectedDayContent.day} — {selectedDayContent.content_type.replace("_", " ").toUpperCase()}
                                            </h3>
                                            <button onClick={handlePublish} disabled={publishing || !!selectedDayContent.error}
                                                className="btn-primary" style={{ padding: "8px 16px", fontSize: "13px" }}>
                                                {publishing ? "..." : "🚀 Publish"}
                                            </button>
                                        </div>

                                        {/* Image */}
                                        {selectedDayContent.image_url && (
                                            <div style={{ borderRadius: "12px", overflow: "hidden", background: "rgba(0,0,0,0.15)", marginBottom: "16px", maxWidth: "100%", margin: "0 auto 16px auto" }}>
                                                <img
                                                    src={`${BACKEND_URL}${selectedDayContent.image_url}`}
                                                    alt="AI Generated"
                                                    style={{ width: "100%", height: "auto", display: "block" }}
                                                />
                                            </div>
                                        )}

                                        {/* Caption */}
                                        {selectedDayContent.canonical_post && (
                                            <div style={{ marginBottom: "14px" }}>
                                                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--purple-light)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                                                    📝 Canonical Post
                                                </div>
                                                <p style={{ color: "var(--text-primary)", fontSize: "14px", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                                                    {selectedDayContent.canonical_post}
                                                </p>
                                            </div>
                                        )}

                                        {/* Video script */}
                                        {selectedDayContent.video_script && (
                                            <div style={{ marginBottom: "14px" }}>
                                                <div style={{ fontSize: "11px", fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                                                    🎬 Video Script
                                                </div>
                                                <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                                                    <div><strong style={{ color: "var(--text-primary)" }}>Hook:</strong> <span style={{ color: "var(--text-secondary)" }}>{selectedDayContent.video_script.hook}</span></div>
                                                    <div><strong style={{ color: "var(--text-primary)" }}>Body:</strong> <span style={{ color: "var(--text-secondary)" }}>{selectedDayContent.video_script.body}</span></div>
                                                    <div><strong style={{ color: "var(--text-primary)" }}>CTA:</strong> <span style={{ color: "var(--text-secondary)" }}>{selectedDayContent.video_script.cta}</span></div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Carousel */}
                                        {selectedDayContent.carousel && (
                                            <div style={{ marginBottom: "14px" }}>
                                                <div style={{ fontSize: "11px", fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                                                    🖼️ Carousel: {selectedDayContent.carousel.title}
                                                </div>
                                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                                    {selectedDayContent.carousel.slides?.map((slide: any, idx: number) => (
                                                        <div key={idx} style={{ padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                                                            <strong style={{ color: "var(--text-primary)", fontSize: "13px" }}>Slide {slide.slide_number}:</strong>{" "}
                                                            <span style={{ color: "#10b981", fontSize: "13px" }}>{slide.title}</span>
                                                            <p style={{ color: "var(--text-secondary)", marginTop: "3px", fontSize: "13px", lineHeight: 1.5 }}>{slide.body}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Tags */}
                                        {selectedDayContent.tags && selectedDayContent.tags.length > 0 && (
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                                                {selectedDayContent.tags.map((tag, i) => (
                                                    <span key={i} className="hashtag" style={{ fontSize: "12px", padding: "4px 12px" }}>#{tag.replace(/^#+/, '')}</span>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="glass-card" style={{ padding: "40px 24px", textAlign: "center" }}>
                                <p style={{ color: "var(--text-muted)", fontSize: "15px", marginBottom: "20px" }}>
                                    Select a date with content to preview
                                </p>
                                <button className="btn-primary" style={{ padding: "12px 24px", fontSize: "14px" }}
                                    onClick={() => {
                                        const params = new URLSearchParams();
                                        if (brandId) params.set("brand_id", brandId);
                                        if (companyName) params.set("company", companyName);
                                        const qs = params.toString();
                                        router.push(`/campaign/create${qs ? `?${qs}` : ""}`);
                                    }}>
                                    + Create Campaign
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div style={{ color: "#94a3b8", padding: "40px", textAlign: "center" }}>Loading...</div>}>
            <DashboardInner />
        </Suspense>
    );
}
