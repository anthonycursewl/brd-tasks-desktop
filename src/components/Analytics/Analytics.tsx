import { useState, useEffect, useCallback } from "react";
import { X, TrendingUp, Clock, Zap, Calendar } from "lucide-react";
import { api, setTokens } from "../../services/api";
import { auth } from "../../services/auth";
import { AnalyticsResponse, DailyStat, WeeklyStat, MonthlyStat } from "../../types/analytics";
import "./Analytics.css";

const PURPLE = "#a855f7";
const PINK = "#ec4899";

function DonutRing({ pct, size = 56 }: { pct: number; size?: number }) {
  const r = size * 0.4;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="donut-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={PURPLE} />
          <stop offset="100%" stopColor={PINK} />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none" stroke="url(#donut-grad)"
        strokeWidth={3} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central"
        fill="white" fontSize={11} fontWeight={700} fontFamily="inherit">
        {pct}%
      </text>
    </svg>
  );
}

function TrendChart({ data, days }: { data: (DailyStat | WeeklyStat | MonthlyStat)[]; days?: boolean }) {
  if (data.length < 2) return null;

  const w = 320;
  const h = 80;
  const pad = { t: 6, r: 4, b: 14, l: 4 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  const maxVal = Math.max(...data.flatMap((d) => [d.created, d.completed]), 1);
  const maxRate = Math.max(...data.map((d) => d.completion_rate), 1);

  const barW = Math.max(3, Math.min(8, cw / data.length / 2 - 1));
  const gap = cw / data.length;

  const xs = data.map((_, i) => pad.l + gap * i + gap / 2);

  return (
    <svg width={w} height={h} className="trend-svg" viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id="bar-created" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={PURPLE} stopOpacity={0.3} />
          <stop offset="100%" stopColor={PURPLE} stopOpacity={0.8} />
        </linearGradient>
        <linearGradient id="bar-completed" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={PINK} stopOpacity={0.3} />
          <stop offset="100%" stopColor={PINK} stopOpacity={0.9} />
        </linearGradient>
        <linearGradient id="rate-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={PURPLE} />
          <stop offset="100%" stopColor={PINK} />
        </linearGradient>
      </defs>

      {data.map((d, i) => {
        const x = xs[i] - gap / 2;
        const hCreated = (d.created / maxVal) * ch;
        const hCompleted = (d.completed / maxVal) * ch;
        const barGap = 1;

        return (
          <g key={i}>
            <rect
              x={x + barGap} y={pad.t + ch - hCreated}
              width={barW} height={hCreated} rx={1}
              fill="url(#bar-created)"
            />
            <rect
              x={x + barW + barGap * 2} y={pad.t + ch - hCompleted}
              width={barW} height={hCompleted} rx={1}
              fill="url(#bar-completed)"
            />
          </g>
        );
      })}

      {(() => {
        const rateYs = data.map((d) => pad.t + ch - (d.completion_rate / maxRate) * ch);
        const d = rateYs.map((y, i) => `${i === 0 ? "M" : "L"}${xs[i].toFixed(1)},${y.toFixed(1)}`).join(" ");
        return (
          <path d={d} fill="none" stroke="url(#rate-line)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
        );
      })()}

      {data.map((d, i) => {
        if (i % Math.ceil(data.length / 6) !== 0) return null;
        const label = days
          ? new Date((d as DailyStat).date).getDate().toString()
          : "week" in d ? (d as WeeklyStat).week.slice(-5) : (d as MonthlyStat).month.slice(-2);
        return (
          <text key={i} x={xs[i]} y={h - 2} textAnchor="middle"
            fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="inherit">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skel ${className || ""}`} />;
}

export function Analytics({ onClose }: AnalyticsProps) {
  const [closing, setClosing] = useState(false);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 300);
  }, [onClose]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    const state = auth.load();
    if (state.mode !== "account" || !state.tokens) {
      setError("Inicia sesión para ver analytics");
      setLoading(false);
      return;
    }
    setTokens(state.tokens);
    try {
      const res = await api.analytics.get();
      setData(res);
    } catch (e: any) {
      setError(typeof e?.message === "string" ? e.message : "Error al cargar analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const overview = data?.overview;
  const summary = data?.summary;
  const streaks = data?.streaks;
  const byPriority = data?.charts?.distribution.by_priority;
  const byStatus = data?.charts?.distribution.by_status;
  const daily = data?.daily;
  const weekly = data?.weekly;
  const monthly = data?.monthly;

  return (
    <div className={`analytics-overlay${closing ? " closing" : ""}`} onClick={handleClose}>
      <div className={`analytics-panel${closing ? " closing" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="analytics-head">
          <img src="/brd/brd_dark_logo_nobg.png" className="analytics-logo" alt="" />
          <span className="analytics-title">
            <span className="at-light">Analy</span><span className="at-dark">tics</span>
          </span>
          <button className="analytics-close" onClick={handleClose}><X size={14} /></button>
        </div>

        {loading && (
          <div className="analytics-body">
            <div className="analytics-stats">
              <SkeletonBlock className="skel-card" />
              <SkeletonBlock className="skel-card" />
              <SkeletonBlock className="skel-card" />
              <SkeletonBlock className="skel-card" />
            </div>
            <SkeletonBlock className="skel-chart" />
            <SkeletonBlock className="skel-chart" />
            <SkeletonBlock className="skel-chart" />
          </div>
        )}

        {error && !loading && <p className="analytics-error">{error}</p>}

        {data && !loading && (
          <div className="analytics-body">
            {/* Ring + summary row */}
            <div className="analytics-hero">
              {overview && (
                <div className="hero-ring">
                  <DonutRing pct={overview.completion_rate} size={64} />
                  <div className="hero-stats">
                    <span className="hero-stat"><span className="hero-val">{overview.active}</span> active</span>
                    <span className="hero-stat"><span className="hero-val">{overview.overdue}</span> overdue</span>
                    <span className="hero-stat"><span className="hero-val">{overview.total}</span> total</span>
                  </div>
                </div>
              )}
              {streaks && (
                <div className="hero-streak">
                  <Zap size={14} />
                  <span><strong>{streaks.current}</strong> day streak</span>
                </div>
              )}
            </div>

            {/* Stat cards */}
            <div className="analytics-stats">
              {summary && (
                <>
                  <StatCard label="Created" value={summary.tasks_created} icon={<TrendingUp size={13} />} />
                  <StatCard label="Completed" value={summary.tasks_completed} icon={<Clock size={13} />} />
                  <StatCard label="Avg time" value={`${summary.avg_completion_hours.toFixed(1)}h`} icon={<Clock size={13} />} />
                  {summary.tasks_expired > 0 && <StatCard label="Expired" value={summary.tasks_expired} icon={<Calendar size={13} />} />}
                </>
              )}
            </div>

            {/* Priority distribution - gradient bars instead of colors */}
            {byPriority && byPriority.length > 0 && (
              <div className="analytics-section">
                <span className="analytics-section-title">Priority</span>
                <div className="progress-list">
                  {byPriority.map((item, _, arr) => {
                    const maxVal = Math.max(...arr.map((x) => x.value), 1);
                    return (
                      <div key={item.name} className="progress-row">
                        <div className="progress-row-head">
                          <span className="progress-label">{item.name}</span>
                          <span className="progress-val">{item.value}</span>
                        </div>
                        <ProgressBar value={item.value} max={maxVal} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Status distribution */}
            {byStatus && byStatus.length > 0 && (
              <div className="analytics-section">
                <span className="analytics-section-title">Status</span>
                <div className="progress-list">
                  {byStatus.map((item, _, arr) => {
                    const maxVal = Math.max(...arr.map((x) => x.value), 1);
                    return (
                      <div key={item.name} className="progress-row">
                        <div className="progress-row-head">
                          <span className="progress-label">{item.name}</span>
                          <span className="progress-val">{item.value}</span>
                        </div>
                        <ProgressBar value={item.value} max={maxVal} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Daily chart */}
            {daily && daily.length >= 2 && (
              <div className="analytics-section">
                <span className="analytics-section-title">Daily</span>
                <TrendChart data={daily} days />
              </div>
            )}

            {/* Weekly chart */}
            {weekly && weekly.length >= 2 && (
              <div className="analytics-section">
                <span className="analytics-section-title">Weekly</span>
                <TrendChart data={weekly} />
              </div>
            )}

            {/* Monthly chart */}
            {monthly && monthly.length >= 2 && (
              <div className="analytics-section">
                <span className="analytics-section-title">Monthly</span>
                <TrendChart data={monthly} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface AnalyticsProps {
  onClose: () => void;
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="stat-card">
      <div className="stat-body">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-icon">{icon}</div>
    </div>
  );
}
