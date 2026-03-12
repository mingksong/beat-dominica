import { useState, useMemo } from 'react';
import { DOM_PITCHES, DOM_BATTERS, DomBatter } from './data/domBatterData';
import BatterSelector from './components/BatterSelector';
import PitchLocationChart from './components/PitchLocationChart';
import PitchLegend from './components/PitchLegend';
import TwoStrikeAnalysis from './components/TwoStrikeAnalysis';
import HotColdZone from './components/HotColdZone';
import PitchTypePerformance from './components/PitchTypePerformance';
import PlateDiscipline from './components/PlateDiscipline';
import ScoutingInsights from './components/ScoutingInsights';
import SprayChart from './components/SprayChart';

export default function App() {
  const defaultBatter = DOM_BATTERS.length > 0 ? DOM_BATTERS[0].name : null;
  const [selectedBatter, setSelectedBatter] = useState<string | null>(defaultBatter);

  const activeBatter = selectedBatter ?? defaultBatter;

  const filteredPitches = useMemo(() => {
    if (!activeBatter) return [];
    return DOM_PITCHES.filter(p => p.batter === activeBatter);
  }, [activeBatter]);

  const batterInfo: DomBatter | null = useMemo(() => {
    if (!activeBatter) return null;
    return DOM_BATTERS.find(b => b.name === activeBatter) ?? null;
  }, [activeBatter]);

  const totalBatters = DOM_BATTERS.length;
  const totalPitches = DOM_PITCHES.length;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-50 via-white to-blue-50 border-b border-gray-300">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">&#x1F1E9;&#x1F1F4;</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Team Dominicana Report
              </h1>
              <p className="text-[10px] text-gray-400">
                WBC 2026 | Dominican Republic Batters Scouting
              </p>
            </div>
            <div className="ml-auto text-right">
              <span className="text-sm font-bold text-red-400">vs 🇰🇷 Korea</span>
              <p className="text-[10px] text-gray-400">투수 시점 분석</p>
            </div>
          </div>
          <div className="flex gap-4 ml-11 text-[10px] text-gray-500">
            <span>{totalBatters}명 타자</span>
            <span>|</span>
            <span>총 {totalPitches.toLocaleString()}구 분석</span>
            <span>|</span>
            <span>Data: MLB Statcast 2024-2025</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Batter Selector */}
        <section>
          <BatterSelector selected={activeBatter} onSelect={setSelectedBatter} />
        </section>

        {/* Batter Profile Card */}
        {batterInfo && (
          <div className="text-center bg-gray-50 rounded-lg p-3 border border-gray-300">
            <h2 className="text-lg font-semibold text-gray-900">
              {batterInfo.name}
              <span className="text-sm text-gray-500 ml-2">
                ({batterInfo.batSide === 'S' ? '양타' : batterInfo.batSide === 'L' ? '좌타' : '우타'})
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {batterInfo.position} | {batterInfo.pitchCount.toLocaleString()}구 데이터
            </p>
          </div>
        )}

        {filteredPitches.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">&#x26BE;</div>
            <p className="text-gray-500 text-sm">데이터를 로딩 중입니다...</p>
            <p className="text-gray-500 text-xs mt-1">
              scripts/fetch_dom_batters.py 실행 후 새로고침하세요
            </p>
          </div>
        ) : (
          <>
            {/* Scouting Insights (top for immediate actionable info) */}
            <section>
              <ScoutingInsights pitches={filteredPitches} batterInfo={batterInfo} />
            </section>

            {/* Pitch Location Charts - 3 panels */}
            <section>
              <PitchLocationChart pitches={filteredPitches} />
            </section>

            {/* Spray Chart */}
            <section>
              <SprayChart pitches={filteredPitches} />
            </section>

            {/* Pitch Legend */}
            <section>
              <PitchLegend pitches={filteredPitches} />
            </section>

            {/* Hot/Cold Zone Analysis */}
            <section>
              <HotColdZone pitches={filteredPitches} />
            </section>

            {/* Pitch Type Performance */}
            <section>
              <PitchTypePerformance pitches={filteredPitches} />
            </section>

            {/* Plate Discipline */}
            <section>
              <PlateDiscipline pitches={filteredPitches} />
            </section>

            {/* Two-Strike Analysis */}
            <section>
              <TwoStrikeAnalysis pitches={filteredPitches} />
            </section>
          </>
        )}

        {/* Footer */}
        <footer className="text-center text-[10px] text-gray-500 py-4 border-t border-gray-200">
          <p>Data: MLB Statcast (Baseball Savant) | 투수 시점 (Pitcher&apos;s Perspective)</p>
          <p className="mt-1">모든 차트의 좌우는 원본 데이터를 반전하여 투수가 마운드에서 바라보는 시점입니다</p>
        </footer>
      </main>
    </div>
  );
}
