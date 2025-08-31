import React, { useEffect, useState } from 'react';
import './TimerModal.css';
import type { Timer } from '../types';

interface TimerType {
  name: string;
  color: string;
}

interface Props {
  timers: Timer[];
  addTimer: (timer: Timer) => void;
  startTimer: (id: number) => void;
  stopTimer: (id: number) => void;
  removeTimer: (id: number) => void;
  onClose: () => void;
}

export default function TimerModal({
  timers,
  addTimer,
  startTimer,
  stopTimer,
  removeTimer,
  onClose,
}: Props) {
  const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db', '#9b59b6', '#34495e'];

  const [activeTab, setActiveTab] = useState<'list' | 'settings'>('list');
  const [defaultLabel, setDefaultLabel] = useState('work-timer');
  const [timerTypes, setTimerTypes] = useState<TimerType[]>([
    { name: '업무', color: '#2ecc71' },
    { name: '학습', color: '#3498db' },
    { name: '브레이크', color: '#e74c3c' },
  ]);

  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState(colors[0]);

  const [timerLabel, setTimerLabel] = useState(defaultLabel);
  const [timerType, setTimerType] = useState(timerTypes[0]?.name || '');
  const [duration, setDuration] = useState(60);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setTimerLabel(defaultLabel);
  }, [defaultLabel]);

  const handleAddType = () => {
    if (!newTypeName.trim()) return;
    setTimerTypes([...timerTypes, { name: newTypeName, color: newTypeColor }]);
    setNewTypeName('');
  };

  const handleRemoveType = (name: string) => {
    setTimerTypes(timerTypes.filter((t) => t.name !== name));
    if (timerType === name) {
      setTimerType('');
    }
  };

  const handleAddTimer = () => {
    console.log('[타이머 추가 버튼 클릭]', { label: timerLabel, type: timerType, duration });
    if (!timerLabel.trim() || !timerType || duration <= 0) {
      console.log('[타이머 추가 실패] 입력값 오류');
      return;
    }
    addTimer({
      id: Date.now(),
      label: timerLabel,
      type: timerType,
      duration,
      running: false,
    });
    console.log('[타이머 추가 요청 완료]');
    setTimerLabel(defaultLabel);
    setTimerType(timerTypes[0]?.name || '');
    // setDuration(25); // 마지막 생성한 타이머 시간 유지 (초기화하지 않음)
  };

  return (
    <div className="timer-modal">
      <header className="modal-header">
        <h1>FlowRoutine</h1>
        <button className="close" onClick={onClose}>
          ×
        </button>
        <nav className="tab-nav">
          <button
            className={`tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            타이머 목록
          </button>
          <button
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            설정
          </button>
        </nav>
      </header>

      {activeTab === 'settings' && (
        <>
          <section className="section">
            <h2>기본 라벨 설정</h2>
            <div className="field">
              <label>기본 타이머 라벨</label>
              <input
                type="text"
                value={defaultLabel}
                onChange={(e) => setDefaultLabel(e.target.value)}
              />
            </div>
          </section>

          <section className="section">
            <h2>타이머 타입 관리</h2>
            <div className="field">
              <label>현재 타이머 타입</label>
              <div className="current-types">
                {timerTypes.map((t) => (
                  <span
                    key={t.name}
                    className="current-type"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.name}
                    <button
                      className="delete"
                      onClick={() => handleRemoveType(t.name)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="field">
              <label>새 타이머 타입 추가</label>
              <input
                type="text"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="타이머 타입 이름을 선택하세요"
              />
              <div className="color-picker">
                {colors.map((color) => (
                  <span
                    key={color}
                    className={`color ${newTypeColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewTypeColor(color)}
                  />
                ))}
              </div>
              <button className="primary" onClick={handleAddType}>
                + 타입 추가
              </button>
            </div>
          </section>
        </>
      )}

      {activeTab === 'list' && (
        <>
          <section className="section">
            <h2>새 타이머 추가</h2>
            <div className="field">
              <label>타이머 라벨</label>
              <input
                type="text"
                value={timerLabel}
                onChange={(e) => setTimerLabel(e.target.value)}
                placeholder={defaultLabel}
              />
            </div>
            <div className="field">
              <label>타이머 타입</label>
              <select
                value={timerType}
                onChange={(e) => setTimerType(e.target.value)}
              >
                <option value="" disabled>
                  타이머 타입을 선택하세요
                </option>
                {timerTypes.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>지속 시간: {duration}분</label>
              <input
                type="range"
                min="0"
                max="60"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
            <button className="primary" onClick={() => { console.log('[타이머 추가 버튼 클릭]'); handleAddTimer(); }}>
              + 타이머 추가
            </button>
          </section>

          <section className="section">
            <h2>타이머 목록</h2>
            {timers.length === 0 && (
              <p>등록된 타이머가 없습니다. 타이머를 추가해보세요.</p>
            )}
            <ul className="timer-list">
              {timers.map((t) => (
                <li key={t.id} className="timer-item">
                  <span>
                    {t.label} ({t.type}) - {t.duration}분
                    {t.running && t.endTime && (
                      <>
                        {' '}
                        -
                        {(() => {
                          const rem = Math.max(0, t.endTime! - now);
                          const m = Math.floor(rem / 60000)
                            .toString()
                            .padStart(2, '0');
                          const s = Math.floor((rem % 60000) / 1000)
                            .toString()
                            .padStart(2, '0');
                          return ` ${m}:${s}`;
                        })()}
                      </>
                    )}
                  </span>
                  <span>
                    {t.running ? (
                      <button onClick={() => stopTimer(t.id)}>중지</button>
                    ) : (
                      <button onClick={() => startTimer(t.id)}>시작</button>
                    )}
                    <button onClick={() => removeTimer(t.id)}>삭제</button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

