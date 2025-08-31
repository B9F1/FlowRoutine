import React, { useEffect, useState } from 'react';
import StatsBarChart from './components/StatsBarChart';
import type { StatRecord } from './types';
import './StatsPage.css';

declare const chrome: any;

interface Totals {
  [label: string]: number;
}

function aggregate(
  records: StatRecord[],
  rangeMs: number,
  startHour: number,
  endHour: number
): Totals {
  const now = Date.now();
  const totals: Totals = {};
  records.forEach((r) => {
    const withinRange = now - r.timestamp <= rangeMs;
    const hour = new Date(r.timestamp).getHours();
    const withinHours = hour >= startHour && hour < endHour;
    if (withinRange && withinHours) {
      totals[r.label] = (totals[r.label] || 0) + r.duration;
    }
  });
  return totals;
}

export default function StatsPage() {
  const [records, setRecords] = useState<StatRecord[]>([]);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [startHour, setStartHour] = useState(0);
  const [endHour, setEndHour] = useState(24);

  useEffect(() => {
    chrome.storage?.local.get(['stats'], (data: any) => {
      if (Array.isArray(data?.stats)) {
        setRecords(data.stats as StatRecord[]);
      }
    });
  }, []);

  const rangeMsMap = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
  };

  const totals = aggregate(records, rangeMsMap[period], startHour, endHour);

  const chartData = {
    labels: Object.keys(totals),
    datasets: [
      {
        label: '집중 시간',
        data: Object.values(totals),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: {
        display: true,
        text: `${period === 'day' ? '일별' : period === 'week' ? '주별' : '월별'} ${startHour}시~${endHour}시`,
      },
    },
  };

  return (
    <div className="stats-page">
      <h1>사용 통계</h1>
      <div className="controls">
        <label>
          기간:
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'day' | 'week' | 'month')}
          >
            <option value="day">일별</option>
            <option value="week">주별</option>
            <option value="month">월별</option>
          </select>
        </label>
        <label>
          시작 시간:
          <input
            type="number"
            min={0}
            max={23}
            value={startHour}
            onChange={(e) => setStartHour(Number(e.target.value))}
          />
        </label>
        <label>
          종료 시간:
          <input
            type="number"
            min={1}
            max={24}
            value={endHour}
            onChange={(e) => setEndHour(Number(e.target.value))}
          />
        </label>
      </div>
      <StatsBarChart data={chartData} options={options} />
    </div>
  );
}
