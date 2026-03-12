import { DomPitch } from '../data/domBatterData';

const SZ_HALF = 0.7083;

interface DisciplineStats {
  totalPitches: number;
  inZone: number;
  outZone: number;
  zoneSwings: number;
  zoneContact: number;
  outSwings: number;
  outContact: number;
  firstPitchSwings: number;
  firstPitchTotal: number;
  calledStrikes: number;
  walks: number;
  strikeouts: number;
  totalABs: number;
}

function isInZone(p: DomPitch): boolean {
  const absPx = Math.abs(p.pX);
  return absPx <= SZ_HALF && p.pZ >= p.szBot && p.pZ <= p.szTop;
}

function isSwing(p: DomPitch): boolean {
  const d = p.callDesc.toLowerCase();
  return d.includes('swinging') || d.includes('foul') || d.includes('in play') || d.includes('missed');
}

function isContact(p: DomPitch): boolean {
  const d = p.callDesc.toLowerCase();
  return d.includes('foul') || d.includes('in play');
}

function computeDiscipline(pitches: DomPitch[]): DisciplineStats {
  const stats: DisciplineStats = {
    totalPitches: pitches.length,
    inZone: 0, outZone: 0,
    zoneSwings: 0, zoneContact: 0,
    outSwings: 0, outContact: 0,
    firstPitchSwings: 0, firstPitchTotal: 0,
    calledStrikes: 0, walks: 0, strikeouts: 0, totalABs: 0,
  };

  const abTracker = new Set<string>();

  for (const p of pitches) {
    const inZ = isInZone(p);
    const swung = isSwing(p);
    const contacted = isContact(p);

    if (inZ) {
      stats.inZone++;
      if (swung) stats.zoneSwings++;
      if (contacted) stats.zoneContact++;
    } else {
      stats.outZone++;
      if (swung) stats.outSwings++;
      if (contacted) stats.outContact++;
    }

    if (p.callDesc.toLowerCase().includes('called strike')) stats.calledStrikes++;

    // First pitch tracking
    if (p.balls === 0 && p.strikes === 0) {
      stats.firstPitchTotal++;
      if (swung) stats.firstPitchSwings++;
    }

    // AB results
    if (p.abResult && p.abResult !== '') {
      const key = `${p.batter}-${p.pitcher}-${p.abResult}`;
      if (!abTracker.has(key)) {
        abTracker.add(key);
        stats.totalABs++;
        if (p.abResult === 'Walk' || p.abResult === 'Intent Walk') stats.walks++;
        if (p.abResult.includes('Strikeout')) stats.strikeouts++;
      }
    }
  }

  return stats;
}

function StatBar({ label, value, desc, color, benchmark }: {
  label: string;
  value: string;
  desc: string;
  color: string;
  benchmark?: { avg: number; good: string };
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-200">
      <div>
        <span className="text-xs text-gray-700 font-medium">{label}</span>
        <span className="text-[10px] text-gray-400 ml-1.5">{desc}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold" style={{ color }}>{value}</span>
        {benchmark && (
          <span className="text-[9px] text-gray-500">MLB avg: {benchmark.avg}% ({benchmark.good})</span>
        )}
      </div>
    </div>
  );
}

export default function PlateDiscipline({ pitches }: { pitches: DomPitch[] }) {
  if (pitches.length < 20) return null;

  const stats = computeDiscipline(pitches);

  const zSwingPct = stats.inZone > 0 ? (stats.zoneSwings / stats.inZone * 100) : 0;
  const oSwingPct = stats.outZone > 0 ? (stats.outSwings / stats.outZone * 100) : 0;
  const zContactPct = stats.zoneSwings > 0 ? (stats.zoneContact / stats.zoneSwings * 100) : 0;
  const oContactPct = stats.outSwings > 0 ? (stats.outContact / stats.outSwings * 100) : 0;
  const swingPct = stats.totalPitches > 0 ? ((stats.zoneSwings + stats.outSwings) / stats.totalPitches * 100) : 0;
  const firstPitchPct = stats.firstPitchTotal > 0 ? (stats.firstPitchSwings / stats.firstPitchTotal * 100) : 0;
  const zonePct = stats.totalPitches > 0 ? (stats.inZone / stats.totalPitches * 100) : 0;
  const kPct = stats.totalABs > 0 ? (stats.strikeouts / stats.totalABs * 100) : 0;
  const bbPct = stats.totalABs > 0 ? (stats.walks / stats.totalABs * 100) : 0;

  // Color coding based on pitcher utility (red = bad for pitcher, green = good for pitcher)
  const oSwingColor = oSwingPct >= 30 ? '#22c55e' : oSwingPct >= 25 ? '#fbbf24' : '#ef4444';
  const zContactColor = zContactPct >= 90 ? '#ef4444' : zContactPct >= 85 ? '#fbbf24' : '#22c55e';
  const kColor = kPct >= 25 ? '#22c55e' : kPct >= 20 ? '#fbbf24' : '#ef4444';
  const bbColor = bbPct >= 12 ? '#ef4444' : bbPct >= 8 ? '#fbbf24' : '#22c55e';

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-300">
      <h3 className="text-sm font-semibold text-gray-800 mb-1">
        타석 규율 분석 (Plate Discipline)
      </h3>
      <p className="text-[10px] text-gray-400 mb-3">
        투수 시점: <span className="text-green-400">녹색</span> = 투수에게 유리 / <span className="text-red-400">빨강</span> = 타자에게 유리
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">스윙 경향</h4>
          <StatBar label="O-Swing%" value={`${oSwingPct.toFixed(1)}%`} desc="존 밖 스윙" color={oSwingColor} />
          <StatBar label="Z-Swing%" value={`${zSwingPct.toFixed(1)}%`} desc="존 안 스윙" color="#94a3b8" />
          <StatBar label="Swing%" value={`${swingPct.toFixed(1)}%`} desc="전체 스윙" color="#94a3b8" />
          <StatBar label="1st Pitch%" value={`${firstPitchPct.toFixed(1)}%`} desc="초구 스윙" color="#94a3b8" />
        </div>

        <div>
          <h4 className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">컨택 & 결과</h4>
          <StatBar label="Z-Contact%" value={`${zContactPct.toFixed(1)}%`} desc="존 안 컨택" color={zContactColor} />
          <StatBar label="O-Contact%" value={`${oContactPct.toFixed(1)}%`} desc="존 밖 컨택" color="#94a3b8" />
          <StatBar label="K%" value={`${kPct.toFixed(1)}%`} desc="삼진율" color={kColor} />
          <StatBar label="BB%" value={`${bbPct.toFixed(1)}%`} desc="볼넷율" color={bbColor} />
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-100 rounded p-2">
            <div className="text-lg font-bold text-gray-900">{stats.totalPitches}</div>
            <div className="text-[10px] text-gray-400">총 투구</div>
          </div>
          <div className="bg-gray-100 rounded p-2">
            <div className="text-lg font-bold text-gray-900">{zonePct.toFixed(0)}%</div>
            <div className="text-[10px] text-gray-400">존 내 비율</div>
          </div>
          <div className="bg-gray-100 rounded p-2">
            <div className="text-lg font-bold text-gray-900">{stats.totalABs}</div>
            <div className="text-[10px] text-gray-400">총 타석</div>
          </div>
        </div>
      </div>
    </div>
  );
}
