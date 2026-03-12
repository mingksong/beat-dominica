import { useState, useMemo } from 'react';
import { DomPitch } from '../data/domBatterData';

type BbTypeFilter = 'all' | 'fly_ball' | 'line_drive' | 'ground_ball';

const BB_TYPE_LABELS: Record<BbTypeFilter, string> = {
  all: '전체',
  fly_ball: '뜬공',
  line_drive: '라인드라이브',
  ground_ball: '땅볼',
};

function getDotColor(abResult: string): string {
  if (abResult === 'Single') return '#3b82f6';
  if (abResult === 'Double') return '#f59e0b';
  if (abResult === 'Triple') return '#8b5cf6';
  if (abResult === 'Home Run') return '#ef4444';
  return '#9ca3af';
}

// Uniform scale: 400ft → 250 SVG units
const SCALE = 250 / 400;
const HOME = { x: 150, y: 280 };

function polar(distFt: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: HOME.x + distFt * SCALE * Math.sin(rad),
    y: HOME.y - distFt * SCALE * Math.cos(rad),
  };
}

function toSvgCoords(hcX: number, hcY: number) {
  const xFeet = 2.5 * (hcX - 125.42);
  const yFeet = 2.5 * (198.27 - hcY);
  return { x: HOME.x + xFeet * SCALE, y: HOME.y - yFeet * SCALE };
}

function BaseballField() {
  const first = polar(90, 45);
  const second = polar(90 * Math.SQRT2, 0);
  const third = polar(90, -45);

  const lf = polar(330, -45);
  const cf = polar(400, 0);
  const rf = polar(330, 45);

  // Infield grass boundary: Bezier arc that passes BEYOND 2B
  // Real infield arc is ~95ft from pitching rubber (60.5ft from home)
  // So arc peak ≈ 155ft from home, well past 2B at 127ft
  const infStart = polar(100, -48);
  const infEnd = polar(100, 48);
  const infControl = polar(160, 0); // control point past 2B

  const mound = polar(60.5, 0);

  return (
    <g>
      <path
        d={`M ${HOME.x} ${HOME.y} L ${lf.x} ${lf.y} Q ${cf.x} ${cf.y - 8} ${rf.x} ${rf.y} Z`}
        fill="#d1fae5" opacity="0.4"
      />
      <path
        d={`M ${lf.x} ${lf.y} Q ${cf.x} ${cf.y - 8} ${rf.x} ${rf.y}`}
        fill="none" stroke="#94a3b8" strokeWidth="1.5"
      />
      <line x1={HOME.x} y1={HOME.y} x2={lf.x} y2={lf.y} stroke="#cbd5e1" strokeWidth="1" />
      <line x1={HOME.x} y1={HOME.y} x2={rf.x} y2={rf.y} stroke="#cbd5e1" strokeWidth="1" />
      <path
        d={`M ${HOME.x} ${HOME.y} L ${first.x} ${first.y} L ${second.x} ${second.y} L ${third.x} ${third.y} Z`}
        fill="#fef3c7" opacity="0.35"
      />
      {/* Infield grass arc — Bezier curving past 2B */}
      <path
        d={`M ${infStart.x} ${infStart.y} Q ${infControl.x} ${infControl.y} ${infEnd.x} ${infEnd.y}`}
        fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,2"
      />
      <line x1={HOME.x} y1={HOME.y} x2={first.x} y2={first.y} stroke="#94a3b8" strokeWidth="1" />
      <line x1={first.x} y1={first.y} x2={second.x} y2={second.y} stroke="#94a3b8" strokeWidth="1" />
      <line x1={second.x} y1={second.y} x2={third.x} y2={third.y} stroke="#94a3b8" strokeWidth="1" />
      <line x1={third.x} y1={third.y} x2={HOME.x} y2={HOME.y} stroke="#94a3b8" strokeWidth="1" />
      <rect x={first.x - 2.5} y={first.y - 2.5} width="5" height="5" fill="white" stroke="#94a3b8" strokeWidth="0.8" transform={`rotate(45 ${first.x} ${first.y})`} />
      <rect x={second.x - 2.5} y={second.y - 2.5} width="5" height="5" fill="white" stroke="#94a3b8" strokeWidth="0.8" transform={`rotate(45 ${second.x} ${second.y})`} />
      <rect x={third.x - 2.5} y={third.y - 2.5} width="5" height="5" fill="white" stroke="#94a3b8" strokeWidth="0.8" transform={`rotate(45 ${third.x} ${third.y})`} />
      <polygon
        points={`${HOME.x},${HOME.y - 4} ${HOME.x + 3},${HOME.y - 1.5} ${HOME.x + 3},${HOME.y + 1.5} ${HOME.x - 3},${HOME.y + 1.5} ${HOME.x - 3},${HOME.y - 1.5}`}
        fill="white" stroke="#94a3b8" strokeWidth="0.8"
      />
      <circle cx={mound.x} cy={mound.y} r="2.5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
    </g>
  );
}

function SprayChartPanel({ pitches, title }: { pitches: DomPitch[]; title: string }) {
  const hitCount = pitches.filter(p =>
    ['Single', 'Double', 'Triple', 'Home Run'].includes(p.abResult)
  ).length;

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-gray-500 mb-1 font-medium">{title}</span>
      <svg viewBox="0 0 300 300" width={240} height={240}
        style={{ background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}
      >
        <BaseballField />
        {pitches.map((p, i) => {
          const { x, y } = toSvgCoords(p.hcX!, p.hcY!);
          const color = getDotColor(p.abResult);
          const isHit = ['Single', 'Double', 'Triple', 'Home Run'].includes(p.abResult);
          return (
            <circle key={i} cx={x} cy={y} r={isHit ? 4.5 : 3.5}
              fill={color} opacity={0.75} stroke="white" strokeWidth="0.5"
            >
              <title>{`${p.abResult}${p.hitDistance ? ` (${p.hitDistance}ft)` : ''}`}</title>
            </circle>
          );
        })}
      </svg>
      <span className="text-[10px] text-gray-400 mt-1">
        {pitches.length}개 타구 · 안타 {hitCount}
      </span>
    </div>
  );
}

export default function SprayChart({ pitches }: { pitches: DomPitch[] }) {
  const [bbType, setBbType] = useState<BbTypeFilter>('all');

  const battedBalls = useMemo(() =>
    pitches.filter(p => p.hcX != null && p.hcY != null && p.callDesc.includes('In play')),
    [pitches]
  );

  const filtered = useMemo(() =>
    bbType === 'all' ? battedBalls : battedBalls.filter(p => p.bbType === bbType),
    [battedBalls, bbType]
  );

  const vsLHP = useMemo(() => filtered.filter(p => p.pitcherHand === 'L'), [filtered]);
  const vsRHP = useMemo(() => filtered.filter(p => p.pitcherHand === 'R'), [filtered]);

  return (
    <div>
      <div className="flex items-center justify-center gap-3 mb-3 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-700">타구 분포 (Spray Chart)</h3>
        <div className="flex rounded-lg overflow-hidden border border-gray-300">
          {(Object.keys(BB_TYPE_LABELS) as BbTypeFilter[]).map(key => {
            const isActive = bbType === key;
            return (
              <button key={key} onClick={() => setBbType(key)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {BB_TYPE_LABELS[key]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3-column layout: All / vs LHP / vs RHP */}
      <div className="flex flex-wrap justify-center gap-4">
        <SprayChartPanel pitches={filtered} title="전체" />
        <SprayChartPanel pitches={vsLHP} title="vs 좌투 (LHP)" />
        <SprayChartPanel pitches={vsRHP} title="vs 우투 (RHP)" />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {[
          { label: '안타', color: '#3b82f6' },
          { label: '2루타', color: '#f59e0b' },
          { label: '3루타', color: '#8b5cf6' },
          { label: '홈런', color: '#ef4444' },
          { label: '아웃', color: '#9ca3af' },
        ].map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-gray-500">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
