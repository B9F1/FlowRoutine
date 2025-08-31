import React, { useEffect, useRef, useState } from 'react';
import './FloatingTimer.css';
import type { Timer } from '../types';
declare const chrome: any;

interface Props {
  timer: Timer;
  stopTimer: (id: number) => void;
}

export default function FloatingTimer({ timer, stopTimer }: Props) {
  const [position, setPosition] = useState({
    x: timer.x ?? window.innerWidth - 160,
    y: timer.y ?? window.innerHeight - 120,
  });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const snapTarget = useRef<{ x: number; y: number } | null>(null);
  const [highlight, setHighlight] = useState(false);
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor(((timer.endTime ?? Date.now()) - Date.now()) / 1000))
  );

  useEffect(() => {
    if (typeof timer.x === 'number' && typeof timer.y === 'number') {
      setPosition({ x: timer.x, y: timer.y });
    }
  }, [timer.x, timer.y]);

  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.max(
        0,
        Math.floor(((timer.endTime ?? Date.now()) - Date.now()) / 1000)
      );
      setRemaining(left);
      if (left <= 0) {
        clearInterval(interval);
        chrome.runtime?.sendMessage({
          type: 'timerEnded',
          id: timer.id,
          label: timer.label,
        });
        stopTimer(timer.id);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timer.id, timer.endTime, stopTimer]);

  useEffect(() => {
    const calcSnap = (x: number, y: number) => {
      const width = 150;
      const height = 80;
      const buffer = 10;
      const candidates: { dist: number; x: number; y: number }[] = [];
      if (x <= buffer) candidates.push({ dist: x, x: 0, y });
      if (window.innerWidth - (x + width) <= buffer)
        candidates.push({
          dist: window.innerWidth - (x + width),
          x: window.innerWidth - width,
          y,
        });
      if (y <= buffer) candidates.push({ dist: y, x, y: 0 });
      if (window.innerHeight - (y + height) <= buffer)
        candidates.push({
          dist: window.innerHeight - (y + height),
          x,
          y: window.innerHeight - height,
        });
      const rect = ref.current?.getBoundingClientRect();
      if (rect) {
        document.querySelectorAll('.floating-timer').forEach((other) => {
          if (other === ref.current) return;
          const o = (other as HTMLDivElement).getBoundingClientRect();
          const dLeft = Math.abs(x - o.right);
          if (dLeft <= buffer) candidates.push({ dist: dLeft, x: o.right, y: o.top });
          const dRight = Math.abs(x + width - o.left);
          if (dRight <= buffer)
            candidates.push({ dist: dRight, x: o.left - width, y: o.top });
          const dTop = Math.abs(y - o.bottom);
          if (dTop <= buffer) candidates.push({ dist: dTop, x: o.left, y: o.bottom });
          const dBottom = Math.abs(y + height - o.top);
          if (dBottom <= buffer)
            candidates.push({ dist: dBottom, x: o.left, y: o.top - height });
        });
      }
      if (candidates.length === 0) return null;
      candidates.sort((a, b) => a.dist - b.dist);
      return { x: candidates[0].x, y: candidates[0].y };
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      e.preventDefault();
      e.stopPropagation();
      const x = e.clientX - offset.x;
      const y = e.clientY - offset.y;
      setPosition({ x, y });
      const snap = calcSnap(x, y);
      snapTarget.current = snap;
      setHighlight(!!snap);
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (!dragging) return;
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      let { x, y } = position;
      const snap = calcSnap(x, y);
      if (snap) {
        x = snap.x;
        y = snap.y;
      }
      setPosition({ x, y });
      setHighlight(false);
      snapTarget.current = null;
      chrome.runtime?.sendMessage({ type: 'moveTimer', id: timer.id, x, y });
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('mouseup', handleMouseUp, true);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('mouseup', handleMouseUp, true);
    };
  }, [dragging, offset, position.x, position.y, timer.id]);

  const minutes = Math.floor(remaining / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (remaining % 60).toString().padStart(2, '0');

  return (
    <div
      ref={ref}
      className={`floating-timer${highlight ? ' snap' : ''}`}
      title={timer.label}
      style={{ left: position.x, top: position.y, backgroundColor: timer.color }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
        setOffset({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
        document.body.style.userSelect = 'none';
      }}
    >
      <div className="timer-time">
        {minutes}:{seconds}
      </div>
      <button
        className="close"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => stopTimer(timer.id)}
      >
        ×
      </button>
    </div>
  );
}

