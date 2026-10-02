"use client";

import { useId, useState } from "react";

import { cn } from "@/lib/utils";

import type { DailyMetric } from "../queries";

const SERIES = [
  { key: "views", label: "Visualizações", value: (d: DailyMetric) => d.views },
  { key: "contatos", label: "Contatos", value: (d: DailyMetric) => d.whatsappClicks + d.quoteClicks },
  { key: "orcamentos", label: "Orçamentos", value: (d: DailyMetric) => d.orcamentosRecebidos },
] as const;

// Coordenadas internas do SVG; o SVG estica na largura e os rótulos ficam em HTML (não distorcem).
const W = 300;
const H = 100;
const GAP = 0.6;

const dayLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
const fullLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" });

/** Passo "redondo" para ~4 divisões e o topo do eixo múltiplo dele. */
function niceScale(value: number) {
  if (value <= 4) return { max: 4, step: 1 };
  const rough = value / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = ([1, 2, 2.5, 5, 10].find((s) => s * magnitude >= rough) ?? 10) * magnitude;
  return { max: Math.ceil(value / step) * step, step };
}

/** Barra com topo arredondado ancorada na base. */
function barPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return "";
  const r = Math.min(1.2, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export function MetricsChart({ days }: { days: DailyMetric[] }) {
  const [seriesKey, setSeriesKey] = useState<(typeof SERIES)[number]["key"]>("views");
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();
  const series = SERIES.find((s) => s.key === seriesKey)!;
  const values = days.map(series.value);
  const { max, step } = niceScale(Math.max(...values, 0));
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);

  const slot = W / days.length;
  const y = (v: number) => H - (v / max) * H;
  const xLabels = [0, Math.floor(days.length / 2), days.length - 1];
  const activeDay = active === null ? null : days[active];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={titleId} className="text-lg font-semibold">
          {series.label} nos últimos 30 dias
        </h2>
        <div role="group" aria-label="Métrica do gráfico" className="flex rounded-xl border border-border p-1">
          {SERIES.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={s.key === seriesKey}
              onClick={() => setSeriesKey(s.key)}
              className={cn(
                "h-9 rounded-lg px-3 text-sm font-medium",
                s.key === seriesKey ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-[auto_1fr] gap-x-2">
        <div aria-hidden className="relative h-48 w-8 text-right text-xs text-muted-foreground tabular-nums">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t / max) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
        <div className="relative h-48">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="size-full overflow-visible"
            role="img"
            aria-labelledby={titleId}
            onMouseLeave={() => setActive(null)}
          >
            {ticks.map((t) => (
              <line
                key={t}
                x1={0}
                x2={W}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--border)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {days.map((d, i) => {
              const v = values[i];
              return (
                <g key={d.dia}>
                  <path
                    d={barPath(i * slot + GAP / 2, y(v), slot - GAP, H - y(v))}
                    fill="var(--primary)"
                    opacity={active === null || active === i ? 1 : 0.55}
                  />
                  {/* Alvo de hover do tamanho da coluna inteira. */}
                  <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" onMouseEnter={() => setActive(i)} />
                </g>
              );
            })}
          </svg>
          {activeDay && active !== null && (
            <div
              role="status"
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+6px)] rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs whitespace-nowrap shadow-card"
              style={{ left: `${((active + 0.5) / days.length) * 100}%`, top: `${(y(values[active]) / H) * 100}%` }}
            >
              <div className="text-muted-foreground">{fullLabel.format(new Date(`${activeDay.dia}T00:00:00Z`))}</div>
              <div className="font-semibold tabular-nums">
                {values[active]} {series.label.toLowerCase()}
              </div>
            </div>
          )}
        </div>
        <div />
        <div aria-hidden className="mt-2 flex justify-between text-xs text-muted-foreground">
          {xLabels.map((i) => (
            <span key={i}>{dayLabel.format(new Date(`${days[i].dia}T00:00:00Z`))}</span>
          ))}
        </div>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver dados em tabela</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-border">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-surface-raised text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Dia</th>
                {SERIES.map((s) => (
                  <th key={s.key} className="px-3 py-2 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d.dia} className="border-t border-border">
                  <td className="px-3 py-1.5">{fullLabel.format(new Date(`${d.dia}T00:00:00Z`))}</td>
                  {SERIES.map((s) => (
                    <td key={s.key} className="px-3 py-1.5 text-right tabular-nums">
                      {s.value(d)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
