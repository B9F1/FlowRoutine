import React, { useEffect, useState } from 'react';
import './FloatingTimer.css';
import type { Timer } from '../types';

interface Props {
  timer: Timer;
  stopTimer: (id: number) => void;
}

export default function FloatingTimer({ timer, stopTimer }: Props) {
  const [position, setPosition] = useState({
    x: window.innerWidth - 160,
    y: window.innerHeight - 120,
  });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor(((timer.endTime ?? Date.now()) - Date.now()) / 1000))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.max(
        0,
        Math.floor(((timer.endTime ?? Date.now()) - Date.now()) / 1000)
      );
      setRemaining(left);
      if (left <= 0) {
        clearInterval(interval);
        stopTimer(timer.id);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timer.id, timer.endTime, stopTimer]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      setPosition({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };
    const handleMouseUp = () => {
      if (!dragging) return;
      setDragging(false);
      const width = 150;
      const height = 80;
      const snapX = position.x < window.innerWidth / 2 ? 0 : window.innerWidth - width;
      const snapY = position.y < window.innerHeight / 2 ? 0 : window.innerHeight - height;
      setPosition({ x: snapX, y: snapY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, offset, position.x, position.y]);

  const minutes = Math.floor(remaining / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (remaining % 60).toString().padStart(2, '0');

  return (
    <div
      className="floating-timer"
      style={{ left: position.x, top: position.y }}
      onMouseDown={(e) => {
        setDragging(true);
        setOffset({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
      }}
    >
      <div className="timer-label">{timer.label}</div>
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

