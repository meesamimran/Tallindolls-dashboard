"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Send, MessageCircle, Zap, Users, Link2, Clock, CheckCircle2, ArrowRight,
  Smartphone, Play, Pause, RefreshCw, TrendingUp, Eye, Heart,
} from "lucide-react";

// ── Constants ──

const CARD =
  "bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px] shadow-[var(--shadow-xs)]";

const GRADIENT_BRAND: React.CSSProperties = {
  background: "linear-gradient(135deg, #C8399C 0%, #7C3AED 100%)",
};

const STORY_INTERVAL_MS = 4000; // How fast simulated users comment
const DM_SEND_DELAY_MS = 1500; // Delay before DM is sent

const SAMPLE_NAMES = [
  "kristi.mae", "liisatamm", "annika_style", "merle.fashion",
  "kadri.loves", "evelin.design", "triinu.m", "sirje_k",
  "maarja.r", "helenlook", "piakaru", "liina.belle",
];

const LINK_TEXT = "tallindoll.ee/collections/summer-breeze";

// ── Component ──

export default function DMAutomationPage() {
  const [running, setRunning] = useState(false);
  const [comments, setComments] = useState<{ id: number; name: string; text: string; time: string }[]>([]);
  const [dmLog, setDmLog] = useState<{ id: number; name: string; sent: boolean; time: string }[]>([]);
  const [storySlide, setStorySlide] = useState(0);
  const commentIdRef = useRef(0);
  const dmIdRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-advance story slides
  useEffect(() => {
    if (!running) return;
    const slideTimer = setInterval(() => setStorySlide((s) => (s + 1) % 2), 5000);
    return () => clearInterval(slideTimer);
  }, [running]);

  const startDemo = useCallback(() => {
    setRunning(true);
    setComments([]);
    setDmLog([]);
    setStorySlide(0);
    commentIdRef.current = 0;
    dmIdRef.current = 0;
  }, []);

  const stopDemo = useCallback(() => {
    setRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // Simulate comments coming in
  useEffect(() => {
    if (!running) return;

    const addComment = () => {
      const id = ++commentIdRef.current;
      const name = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
      const variants = ["LINK", "link", "LINK 🔗", "Link please", "link 🙏", "LINK"];
      const text = variants[Math.floor(Math.random() * variants.length)];
      const time = new Date().toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      setComments((prev) => [{ id, name, text, time }, ...prev].slice(0, 20));

      // After delay, show DM being sent to this user
      setTimeout(() => {
        const dmId = ++dmIdRef.current;
        setDmLog((prev) => [{ id: dmId, name, sent: true, time: new Date().toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }, ...prev].slice(0, 20));
      }, DM_SEND_DELAY_MS);
    };

    timerRef.current = setInterval(addComment, STORY_INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  const dmCount = dmLog.length;
  const commentCount = comments.length;

  return (
    <div className="max-w-[1300px] mx-auto px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-[var(--heading)] flex items-center gap-3">
            <Zap className="size-7 text-[var(--brand)]" />
            DM Automation
          </h1>
          <p className="text-[14px] text-[var(--body)] mt-1">
            Story → Comment Trigger → Auto DM. 100% automated sales engine.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!running ? (
            <button onClick={startDemo} className="inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-semibold text-white rounded-[2px] transition-opacity hover:opacity-90" style={GRADIENT_BRAND}>
              <Play className="size-4" /> Start Demo
            </button>
          ) : (
            <button onClick={stopDemo} className="inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-semibold rounded-[2px] border border-[var(--border-default)] text-[var(--heading)] hover:bg-[var(--neutral-secondary-medium)] transition-colors">
              <Pause className="size-4" /> Stop
            </button>
          )}
          <button onClick={startDemo} className="inline-flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium rounded-[2px] border border-[var(--border-default)] text-[var(--body-subtle)] hover:text-[var(--heading)] hover:bg-[var(--neutral-secondary-medium)] transition-colors" title="Restart demo">
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Eye} label="Story Views" value={running ? "1.2K" : "--"} color="var(--brand)" />
        <StatCard icon={MessageCircle} label="LINK Comments" value={running ? String(commentCount) : "--"} color="#38BDF8" />
        <StatCard icon={Send} label="DMs Sent" value={running ? String(dmCount) : "--"} color="#14B8A6" />
        <StatCard icon={TrendingUp} label="Click Rate" value={running ? "94%" : "--"} color="#FB923C" />
      </div>

      {/* Main: 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── COLUMN 1: Story Preview ── */}
        <div className={cn(CARD, "p-5")}>
          <h2 className="text-[14px] font-semibold text-[var(--heading)] mb-3 flex items-center gap-2">
            📱 Story Post
          </h2>
          <div className="flex justify-center">
            <div className="relative mx-auto" style={{ width: 260 }}>
              <div className="rounded-[28px] border-[8px] border-[#1c1c1e] bg-black overflow-hidden shadow-xl">
                <div className="flex items-center justify-between px-4 pt-1.5 pb-0.5 text-[10px] font-semibold text-white bg-black">
                  <span>9:41</span>
                  <span>📶 🔋</span>
                </div>
                <div className="relative" style={{ aspectRatio: "9/16" }}>
                  {/* Slide 0: Product image + CTA */}
                  <div className={cn("absolute inset-0 transition-opacity duration-500", storySlide === 0 ? "opacity-100" : "opacity-0")}>
                    <div className="absolute inset-0 bg-gradient-to-b from-[#C8399C]/80 via-[#7C3AED]/60 to-black flex flex-col items-center justify-center p-6 text-center">
                      <div className="size-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-4">
                        <Link2 className="size-10 text-white" />
                      </div>
                      <p className="text-[22px] font-bold text-white leading-tight drop-shadow-lg">
                        🔥 Flash Sale
                      </p>
                      <p className="text-[28px] font-black text-white mt-1 drop-shadow-lg">
                        UP TO 50% OFF
                      </p>
                      <p className="text-[16px] text-white/90 mt-3 font-medium">
                        Summer Breeze Collection
                      </p>
                      <div className="mt-6 px-6 py-3 bg-white rounded-full">
                        <p className="text-[15px] font-black text-[#C8399C]">
                          Reply &quot;LINK&quot; for instant access →
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Slide 1: Product showcase */}
                  <div className={cn("absolute inset-0 transition-opacity duration-500", storySlide === 1 ? "opacity-100" : "opacity-0")}>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 flex flex-col justify-end p-5">
                      <p className="text-[18px] font-bold text-white drop-shadow-lg">
                        New Collection Just Dropped
                      </p>
                      <p className="text-[13px] text-white/80 mt-1 leading-snug">
                        Be the first to shop. Comment
                      </p>
                      <p className="text-[26px] font-black text-white mt-2 drop-shadow-lg">
                        &quot;LINK&quot; 👇
                      </p>
                      <p className="text-[11px] text-white/60 mt-3">
                        We&apos;ll DM you instantly 💌
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-center text-[11px] text-[var(--body-subtle)] mt-2">
                {storySlide === 0 ? "Story Slide 1 — CTA" : "Story Slide 2 — Product"}
              </p>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {[0, 1].map((i) => (
              <button key={i} onClick={() => setStorySlide(i)} className={cn("size-2 rounded-full transition-all", storySlide === i ? "bg-[var(--brand)] w-4" : "bg-[var(--border-default-medium)]")} />
            ))}
          </div>
        </div>

        {/* ── COLUMN 2: Live Comments ── */}
        <div className={cn(CARD, "p-5")}>
          <h2 className="text-[14px] font-semibold text-[var(--heading)] mb-3 flex items-center gap-2">
            <MessageCircle className="size-4 text-[#38BDF8]" />
            Live Comments
            {running && (
              <span className="ml-auto flex items-center gap-1.5 text-[11px] text-[#38BDF8] font-medium">
                <span className="size-1.5 rounded-full bg-[#38BDF8] animate-pulse" /> Live
              </span>
            )}
          </h2>

          {!running && comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--body-subtle)]">
              <MessageCircle className="size-10 mb-3 opacity-30" />
              <p className="text-[14px] font-semibold text-[var(--heading)]">No comments yet</p>
              <p className="text-[12px] mt-1">Click &quot;Start Demo&quot; to simulate</p>
            </div>
          ) : (
            <div className="space-y-0.5 max-h-[420px] overflow-y-auto">
              {comments.map((c, i) => (
                <div key={c.id} className={cn("flex items-center gap-3 px-3 py-2 rounded-[2px] transition-all animate-fade-in", i === 0 && "bg-[var(--brand-softer)]")}>
                  <div className="size-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={GRADIENT_BRAND}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-[var(--heading)]">{c.name}</span>
                      <span className={cn("px-1.5 py-px text-[10px] font-bold rounded-[2px]", c.text.toLowerCase().includes("link") ? "bg-[#14B8A6]/15 text-[#14B8A6]" : "bg-[var(--neutral-secondary-medium)] text-[var(--body-subtle)]")}>
                        {c.text}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--body-subtle)]">{c.time}</p>
                  </div>
                  {/* Auto DM indicator */}
                  {i === 0 && running && (
                    <div className="flex items-center gap-1 text-[11px] text-[#14B8A6] font-semibold animate-pulse">
                      <Zap className="size-3" /> DMing...
                    </div>
                  )}
                  {dmLog.find((d) => d.name === c.name) && (
                    <CheckCircle2 className="size-4 text-[#14B8A6] shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── COLUMN 3: DM Log ── */}
        <div className={cn(CARD, "p-5")}>
          <h2 className="text-[14px] font-semibold text-[var(--heading)] mb-3 flex items-center gap-2">
            <Send className="size-4 text-[#14B8A6]" />
            Auto DM Outbox
          </h2>

          {dmLog.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--body-subtle)]">
              <Send className="size-10 mb-3 opacity-30" />
              <p className="text-[14px] font-semibold text-[var(--heading)]">Waiting for triggers</p>
              <p className="text-[12px] mt-1">DMs appear here when users comment &quot;LINK&quot;</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[420px] overflow-y-auto">
              {dmLog.map((dm, i) => (
                <div key={dm.id} className={cn("px-3 py-2.5 rounded-[2px] border transition-all animate-fade-in", i === 0 ? "bg-[#14B8A6]/10 border-[#14B8A6]/30" : "bg-[var(--neutral-secondary-medium)] border-[var(--border-default)]")}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-semibold text-[var(--heading)]">
                      To: @{dm.name}
                    </span>
                    <span className="text-[10px] text-[var(--body-subtle)]">{dm.time}</span>
                  </div>
                  {/* DM bubble */}
                  <div className="bg-[var(--brand)] text-white p-2.5 rounded-[2px] rounded-tl-[12px] space-y-1">
                    <p className="text-[13px] font-semibold">
                      🔗 Here&apos;s your link! ✨
                    </p>
                    <p className="text-[12px] text-white/80 leading-snug">
                      Thanks for your interest! Click below to shop the collection:
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 bg-white/15 rounded-[2px] px-2 py-1">
                      <Link2 className="size-3 shrink-0" />
                      <span className="text-[12px] font-mono font-semibold truncate">{LINK_TEXT}</span>
                      <ArrowRight className="size-3 shrink-0" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-1">
                      🤖 Automated message · 100% opt-in
                    </p>
                  </div>
                  {i === 0 && running && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-[#14B8A6] font-semibold">
                      <CheckCircle2 className="size-3" /> Sent ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* How It Works — footer */}
      <div className={cn(CARD, "p-5")}>
        <h2 className="text-[14px] font-semibold text-[var(--heading)] mb-3">⚡ How DM Automation Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StepCard step="1" icon={Eye} title="Post Story" desc="Story goes live with 'Comment LINK' CTA" />
          <StepCard step="2" icon={MessageCircle} title="User Replies" desc="Follower comments 'LINK' on story" />
          <StepCard step="3" icon={Zap} title="Bot Detects" desc="System catches keyword instantly" />
          <StepCard step="4" icon={Send} title="DM Sent" desc="Auto DMs clickable product link" />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string }) {
  return (
    <div className={cn(CARD, "p-4")}>
      <div className="flex items-center gap-2.5">
        <div className="size-9 rounded-[2px] flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <span style={{ color, display: "flex" }}><Icon className="size-4" /></span>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-[var(--body-subtle)] uppercase tracking-wider">{label}</p>
          <p className="text-[20px] font-bold text-[var(--heading)]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StepCard({ step, icon: Icon, title, desc }: { step: string; icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="size-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0" style={GRADIENT_BRAND}>
        {step}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-[var(--heading)] flex items-center gap-1.5">
          <Icon className="size-3.5 text-[var(--brand)]" />
          {title}
        </p>
        <p className="text-[12px] text-[var(--body-subtle)] mt-0.5 leading-snug">{desc}</p>
      </div>
    </div>
  );
}
