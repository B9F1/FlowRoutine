import React, { useEffect, useState } from 'react';
import StatsBarChart from './components/StatsBarChart';
import type { StatRecord } from './types';
import './StatsPage.css';

declare const chrome: any;

interface Totals {
  [label: string]: number;
}

function aggregate(records: StatRecord[], rangeMs: number): Totals {
  const now = Date.now();
  const filtered = records.filter((r) => now - r.timestamp <= rangeMs);
  const totals: Totals = {};
  filtered.forEach((r) => {
    totals[r.label] = (totals[r.label] || 0) + r.duration;
  });
  return totals;
}

function BarChart({ data }: { data: Totals }) {
  // ...기존 코드 제거: react-chartjs-2 기반 StatsBarChart로 대체...
  return null;
}

export default function StatsPage() {
  const [records, setRecords] = useState<StatRecord[]>([]);

  useEffect(() => {
    chrome.storage?.local.get(['stats'], (data: any) => {
      if (Array.isArray(data?.stats)) {
        setRecords(data.stats as StatRecord[]);
      }
    });
  }, []);

  const day = aggregate(records, 24 * 60 * 60 * 1000);
  const week = aggregate(records, 7 * 24 * 60 * 60 * 1000);
  const month = aggregate(records, 30 * 24 * 60 * 60 * 1000);

  const exportCSV = () => {
    const header = 'label,duration,timestamp\n';
    const rows = records
      .map(
        (r) => `${r.label},${r.duration},${new Date(r.timestamp).toISOString()}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'statistics.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Chart.js용 데이터 변환
  const chartData = {
    labels: Object.keys(day),
    datasets: [
      {
        label: '일별 집중 시간',
        data: Object.values(day),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };

  return (
    <div className="stats-page">
      <h1>사용 통계</h1>
      <button onClick={exportCSV}>CSV로 내보내기</button>
      <h2>일별</h2>
      <StatsBarChart data={chartData} />
      {/* 주별/월별은 기존 BarChart 유지 또는 StatsBarChart로 확장 가능 */}
    </div>
  );
}
