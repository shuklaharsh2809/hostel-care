"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import type { TrendPoint } from "@/lib/types";
import { cx } from "./ui";

/**
 * Validated pair (dataviz validator, light surface): blue #2a78d6 / brand green #0f856c —
 * CVD ΔE 17.5, normal-vision ΔE 18.2, both ≥ 3:1 on the surface.
 */
const SERIES = [
  { key: "billed", label: "Billed", color: "#2a78d6" },
  { key: "collected", label: "Collected", color: "#0f856c" },
] as const;

/** ₹ in Indian short form: ₹950, ₹12K, ₹3.4L, ₹1.2Cr */
export function compactINR(paise: number) {
  const r = paise / 100;
  const fmt = (n: number, unit: string) => `₹${n >= 100 ? Math.round(n) : Number(n.toFixed(1))}${unit}`;
  if (r >= 1e7) return fmt(r / 1e7, "Cr");
  if (r >= 1e5) return fmt(r / 1e5, "L");
  if (r >= 1e3) return fmt(r / 1e3, "K");
  return `₹${Math.round(r)}`;
}

function niceMax(v: number) {
  if (v <= 0) return 100;
  const mag = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * mag >= v / 4)! * mag;
  return Math.ceil(v / step) * step;
}

const monthName = (m: string, long = false) =>
  new Date(m + "-01T00:00:00").toLocaleDateString("en-IN", long ? { month: "long", year: "numeric" } : { month: "short" });

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.flatMap((d) => [d.billed, d.collected])));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const latest = data.at(-1);
  const rate = latest && latest.billed ? Math.round((latest.collected / latest.billed) * 100) : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <ul className="flex gap-4 text-xs text-ink-600" aria-label="Legend">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
        <div className="flex rounded-lg bg-ink-100 p-0.5 text-xs font-medium" role="tablist">
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cx("rounded-md px-2.5 py-1 capitalize", view === v ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-800")}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "table" ? (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
              <th className="px-5 py-2 font-medium">Month</th>
              <th className="px-5 py-2 text-right font-medium">Billed</th>
              <th className="px-5 py-2 text-right font-medium">Collected</th>
              <th className="px-5 py-2 text-right font-medium">Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month} className="border-b border-ink-100 last:border-0">
                <td className="px-5 py-2">{monthName(d.month, true)}</td>
                <td className="px-5 py-2 text-right tabular-nums">{money(d.billed)}</td>
                <td className="px-5 py-2 text-right tabular-nums">{money(d.collected)}</td>
                <td className="px-5 py-2 text-right text-ink-500 tabular-nums">{d.billed ? `${Math.round((d.collected / d.billed) * 100)}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="px-5 pt-4 pb-5">
          <div className="relative flex h-56 pl-12">
            {/* gridlines + y labels */}
            {ticks.map((t) => (
              <div key={t} className="pointer-events-none absolute inset-x-0 flex items-center" style={{ bottom: `${(t / max) * 100}%` }}>
                <span className="w-11 shrink-0 pr-2 text-right text-[11px] text-ink-400 tabular-nums">{compactINR(t)}</span>
                <span className={cx("h-px flex-1", t === 0 ? "bg-ink-300" : "bg-ink-100")} />
              </div>
            ))}
            {/* columns */}
            {data.map((d, i) => (
              <div
                key={d.month}
                className="relative flex flex-1 items-end justify-center gap-0.5 px-1 sm:px-2"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${monthName(d.month, true)}: billed ${money(d.billed)}, collected ${money(d.collected)}`}
              >
                {hover === i && <div className="absolute inset-x-1 top-0 bottom-0 rounded-md bg-ink-100/70" />}
                {SERIES.map((s) => (
                  <div
                    key={s.key}
                    className="relative w-full max-w-6 rounded-t-[4px]"
                    style={{ height: `${(d[s.key] / max) * 100}%`, background: s.color, minHeight: d[s.key] ? 2 : 0 }}
                  />
                ))}
                {hover === i && (
                  <div
                    className={cx(
                      "pointer-events-none absolute top-2 z-10 w-44 rounded-lg border border-ink-200 bg-white p-2.5 text-xs shadow-lg",
                      i >= data.length / 2 ? "right-full mr-1" : "left-full ml-1",
                    )}
                  >
                    <p className="mb-1.5 font-semibold text-ink-900">{monthName(d.month, true)}</p>
                    {SERIES.map((s) => (
                      <p key={s.key} className="flex items-center justify-between gap-2 text-ink-600">
                        <span className="flex items-center gap-1.5">
                          <span className="size-2 rounded-sm" style={{ background: s.color }} />
                          {s.label}
                        </span>
                        <span className="font-medium text-ink-900 tabular-nums">{money(d[s.key])}</span>
                      </p>
                    ))}
                    {d.billed > 0 && (
                      <p className="mt-1.5 border-t border-ink-100 pt-1.5 text-ink-500">{Math.round((d.collected / d.billed) * 100)}% collected</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex pl-12">
            {data.map((d) => (
              <span key={d.month} className="flex-1 pt-2 text-center text-xs text-ink-500">
                {monthName(d.month)}
              </span>
            ))}
          </div>
          {latest && (
            <p className="mt-3 text-xs text-ink-500">
              {monthName(latest.month, true)}: {money(latest.collected)} collected of {money(latest.billed)} billed
              {rate !== null && ` (${rate}%)`}. Payments are counted in the month they arrive.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function AgingBars({ buckets }: { buckets: { key: string; label: string; amount: number }[] }) {
  const total = buckets.reduce((s, b) => s + b.amount, 0);
  const max = Math.max(1, ...buckets.map((b) => b.amount));
  return (
    <div className="space-y-4 p-5">
      <p className="text-sm text-ink-500">
        <span className="font-display text-2xl font-bold text-ink-900">{money(total)}</span> unpaid in total
      </p>
      <ul className="space-y-3">
        {buckets.map((b, i) => (
          <li key={b.key}>
            <div className="mb-1 flex justify-between text-sm">
              <span className={cx("text-ink-600", i > 0 && b.amount > 0 && "font-medium text-ink-800")}>{b.label}</span>
              <span className="font-medium text-ink-900 tabular-nums">{money(b.amount)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-100">
              <div className="h-full rounded-full bg-ink-700" style={{ width: `${(b.amount / max) * 100}%`, opacity: 0.45 + i * 0.18 }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
