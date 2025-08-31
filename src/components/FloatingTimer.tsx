import React, { useEffect, useRef, useState } from 'react';
import './FloatingTimer.css';
import type { Timer } from '../types';

declare const chrome: any;

// Dimension of floating timer element
const WIDTH = 150;
const HEIGHT = 80;

/**
 * Return either black or white depending on the brightness of the
 * provided color so that the outline remains visible regardless of the
 * timer background.
 */
function getContrastingColor(hex: string) {
  const value = hex.replace('#', '');
  const r = parseInt(value.substring(0, 2), 16);
  const g = parseInt(value.substring(2, 4), 16);
  const b = parseInt(value.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000' : '#fff';
}

interface Props {
  timer: Timer;
  stopTimer: (id: number) => void;
}

export default function FloatingTimer({ timer, stopTimer }: Props) {
  const [position, setPosition] = useState({
    x: timer.x ?? window.innerWidth - (WIDTH + 10),
    y: timer.y ?? window.innerHeight - (HEIGHT + 40),
  });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState(false);
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor(((timer.endTime ?? Date.now()) - Date.now()) / 1000))
  );
  const bgColor = '#fff';
  const outlineColor = getContrastingColor(bgColor);

  useEffect(() => {
    if (typeof timer.x === 'number' && typeof timer.y === 'number') {
      setPosition({
        x: Math.min(Math.max(timer.x, 0), window.innerWidth - WIDTH),
        y: Math.min(Math.max(timer.y, 0), window.innerHeight - HEIGHT),
      });
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
      const buffer = 10;
      const candidates: { dist: number; x: number; y: number }[] = [];
      if (x <= buffer) candidates.push({ dist: x, x: 0, y });
      if (window.innerWidth - (x + WIDTH) <= buffer)
        candidates.push({
          dist: window.innerWidth - (x + WIDTH),
          x: window.innerWidth - WIDTH,
          y,
        });
      if (y <= buffer) candidates.push({ dist: y, x, y: 0 });
      if (window.innerHeight - (y + HEIGHT) <= buffer)
        candidates.push({
          dist: window.innerHeight - (y + HEIGHT),
          x,
          y: window.innerHeight - HEIGHT,
        });
      document.querySelectorAll('.floating-timer').forEach((other) => {
        if (other === ref.current) return;
        const o = (other as HTMLDivElement).getBoundingClientRect();
        const verticalOverlap = y < o.bottom && y + HEIGHT > o.top;
        const horizontalOverlap = x < o.right && x + WIDTH > o.left;

        if (verticalOverlap) {
          const dLeft = Math.abs(x - o.right);
          if (dLeft <= buffer) candidates.push({ dist: dLeft, x: o.right, y });
          const dRight = Math.abs(x + WIDTH - o.left);
          if (dRight <= buffer)
            candidates.push({ dist: dRight, x: o.left - WIDTH, y });
        }
        if (horizontalOverlap) {
          const dTop = Math.abs(y - o.bottom);
          if (dTop <= buffer) candidates.push({ dist: dTop, x, y: o.bottom });
          const dBottom = Math.abs(y + HEIGHT - o.top);
          if (dBottom <= buffer)
            candidates.push({ dist: dBottom, x, y: o.top - HEIGHT });
        }
      });
      if (candidates.length === 0) return null;
      candidates.sort((a, b) => a.dist - b.dist);
      return { x: candidates[0].x, y: candidates[0].y };
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      e.preventDefault();
      e.stopPropagation();
      const x = Math.min(
        Math.max(e.clientX - offset.x, 0),
        window.innerWidth - WIDTH
      );
      const y = Math.min(
        Math.max(e.clientY - offset.y, 0),
        window.innerHeight - HEIGHT
      );
      setPosition({ x, y });
      const snap = calcSnap(x, y);
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
      x = Math.min(Math.max(x, 0), window.innerWidth - WIDTH);
      y = Math.min(Math.max(y, 0), window.innerHeight - HEIGHT);
      setPosition({ x, y });
      setHighlight(false);
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
      className="floating-timer"
      title={timer.label}
      style={{
        left: position.x,
        top: position.y,
        backgroundColor: bgColor,
        color: '#000',
        outline: highlight ? `2px solid ${outlineColor}` : 'none',
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
        setOffset({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
        document.body.style.userSelect = 'none';
      }}
    >
      <span className="timer-dot" style={{ backgroundColor: timer.color }} />
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

