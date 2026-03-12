import { useState, useMemo } from 'react';
import { DomPitch } from '../data/domBatterData';
import { PITCH_COLORS, getResultColor } from '../utils/pitchColors';

type CountFilter = 'ALL' | 'FIRST' | '2S';

interface PitchLocationChartProps {
  pitches: DomPitch[];
  title: string;
}

const SVG_W = 280;
const SVG_H = 340;
const MARGIN = { top: 20, right: 20, bottom: 30, left: 20 };
const PLOT_W = SVG_W - MARGIN.left - MARGIN.right;
const PLOT_H = SVG_H - MARGIN.top - MARGIN.bottom;

const X_MIN = -2.0;
const X_MAX = 2.0;
const Z_MIN = 0.5;
const Z_MAX = 4.5;

const SZ_HALF = 0.7083;

function toSvgX(pX: number): number {
  const displayX = pX * -1; // Pitcher's perspective: mirror x-axis
  return MARGIN.left + ((displayX - X_MIN) / (X_MAX - X_MIN)) * PLOT_W;
}

function toSvgY(pZ: number): number {
  return MARGIN.top + ((Z_MAX - pZ) / (Z_MAX - Z_MIN)) * PLOT_H;
}

function StrikeZonePanel({ pitches, title }: PitchLocationChartProps) {
  const avgSzTop = pitches.length > 0
    ? pitches.reduce((s, p) => s + p.szTop, 0) / pitches.length : 3.5;
  const avgSzBot = pitches.length > 0
    ? pitches.reduce((s, p) => s + p.szBot, 0) / pitches.length : 1.5;

  const szLeft = toSvgX(SZ_HALF);
  const szRight = toSvgX(-SZ_HALF);
  const szTopY = toSvgY(avgSzTop);
  const szBotY = toSvgY(avgSzBot);

  const hpCenterX = toSvgX(0);
  const hpBaseY = toSvgY(0.1);
  const hpApexY = toSvgY(0.4);
  const hpMidY = toSvgY(0.2);
  const hpPoints = [
    `${toSvgX(SZ_HALF)},${hpBaseY}`,
    `${toSvgX(-SZ_HALF)},${hpBaseY}`,
    `${toSvgX(-0.35)},${hpMidY}`,
    `${hpCenterX},${hpApexY}`,
    `${toSvgX(0.35)},${hpMidY}`,
  ].join(' ');

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-slate-400 mb-1 font-medium">{title}</span>
      <svg width={SVG_W} height={SVG_H} className="rounded-lg">
        <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="#0f172a" rx={8} />
        <rect
          x={szLeft} y={szTopY}
          width={szRight - szLeft} height={szBotY - szTopY}
          fill="none" stroke="#475569" strokeWidth={2}
        />
        {[1, 2].map(i => (
          <g key={`grid-${i}`}>
            <line
              x1={szLeft + (szRight - szLeft) * i / 3} y1={szTopY}
              x2={szLeft + (szRight - szLeft) * i / 3} y2={szBotY}
              stroke="#334155" strokeWidth={1} strokeDasharray="3,3"
            />
            <line
              x1={szLeft} y1={szTopY + (szBotY - szTopY) * i / 3}
              x2={szRight} y2={szTopY + (szBotY - szTopY) * i / 3}
              stroke="#334155" strokeWidth={1} strokeDasharray="3,3"
            />
          </g>
        ))}
        <polygon
          points={hpPoints}
          fill="#94a3b8" fillOpacity={0.2} stroke="#94a3b8" strokeWidth={1}
        />
        {pitches.map((p, idx) => {
          const cx = toSvgX(p.pX);
          const cy = toSvgY(p.pZ);
          const fillColor = PITCH_COLORS[p.pitchCode] ?? '#6b7280';
          const strokeColor = getResultColor(p.callDesc);
          return (
            <circle
              key={idx}
              cx={cx} cy={cy} r={5}
              fill={fillColor} stroke={strokeColor} strokeWidth={1.5}
              opacity={0.7}
            />
          );
        })}
        <text
          x={SVG_W / 2} y={SVG_H - 8}
          textAnchor="middle" fill="#64748b" fontSize={10}
        >
          투수 시점 (Pitcher&apos;s View)
        </text>
      </svg>
      <span className="text-[10px] text-slate-500 mt-1">{pitches.length} pitches</span>
    </div>
  );
}

const COUNT_TABS: { value: CountFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'FIRST', label: '초구' },
  { value: '2S', label: '2스트라이크' },
];

export default function PitchLocationChart({ pitches }: { pitches: DomPitch[] }) {
  const [countFilter, setCountFilter] = useState<CountFilter>('ALL');

  const filtered = useMemo(() => {
    if (countFilter === 'FIRST') return pitches.filter(p => p.balls === 0 && p.strikes === 0);
    if (countFilter === '2S') return pitches.filter(p => p.strikes === 2);
    return pitches;
  }, [pitches, countFilter]);

  const vsLHP = filtered.filter(p => p.pitcherHand === 'L');
  const vsRHP = filtered.filter(p => p.pitcherHand === 'R');

  return (
    <div>
      <div className="flex items-center justify-center gap-3 mb-3 flex-wrap">
        <h3 className="text-sm font-semibold text-slate-300">
          피치 로케이션 맵 (투수 시점)
        </h3>
        <div className="flex rounded-lg overflow-hidden border border-slate-700">
          {COUNT_TABS.map(tab => {
            const count = tab.value === 'ALL' ? pitches.length
              : tab.value === 'FIRST' ? pitches.filter(p => p.balls === 0 && p.strikes === 0).length
              : pitches.filter(p => p.strikes === 2).length;
            const isActive = countFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setCountFilter(tab.value)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {tab.label}
                <span className={`ml-1 text-[10px] ${isActive ? 'text-blue-200' : 'text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        <StrikeZonePanel pitches={filtered} title="전체" />
        <StrikeZonePanel pitches={vsLHP} title="vs 좌투 (LHP)" />
        <StrikeZonePanel pitches={vsRHP} title="vs 우투 (RHP)" />
      </div>
    </div>
  );
}
