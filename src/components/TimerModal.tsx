import React, { useEffect, useState } from 'react';
import './TimerModal.css';
import type { Timer, Settings, TimerType } from '../types';
declare const chrome: any;

interface Props {
  timers: Timer[];
  addTimer: (timer: Timer) => void;
  startTimer: (id: number) => void;
  stopTimer: (id: number) => void;
  removeTimer: (id: number) => void;
  onClose: () => void;
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
}

export default function TimerModal({
  timers,
  addTimer,
  startTimer,
  stopTimer,
  removeTimer,
  onClose,
  settings,
  updateSettings,
}: Props) {
  const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db', '#9b59b6', '#34495e'];

  const [activeTab, setActiveTab] = useState<'list' | 'settings'>('list');
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState(colors[0]);

  const [timerLabel, setTimerLabel] = useState(settings.defaultLabel);
  const [timerType, setTimerType] = useState(settings.timerTypes[0]?.name || '');
  const [duration, setDuration] = useState(60);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setTimerLabel(settings.defaultLabel);
  }, [settings.defaultLabel]);

  const handleAddType = () => {
    if (!newTypeName.trim()) return;
    const types = [...settings.timerTypes, { name: newTypeName, color: newTypeColor }];
    updateSettings({ timerTypes: types });
    setNewTypeName('');
  };

  const handleRemoveType = (name: string) => {
    const types = settings.timerTypes.filter((t) => t.name !== name);
    updateSettings({ timerTypes: types });
    if (timerType === name) {
      setTimerType('');
    }
  };

  const handleAddTimer = () => {
    if (!timerLabel.trim() || !timerType || duration <= 0) {
      return;
    }
    const color = settings.timerTypes.find((t) => t.name === timerType)?.color || '#333';
    addTimer({
      id: Date.now(),
      label: timerLabel,
      type: timerType,
      duration,
      running: false,
      color,
    });
    setTimerLabel(settings.defaultLabel);
    setTimerType(settings.timerTypes[0]?.name || '');
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
          <button
            className="tab"
            onClick={() =>
              chrome.tabs.create({
                url: chrome.runtime.getURL('statistics.html'),
              })
            }
          >
            통계 보기
          </button>
        </nav>
      </header>

      {activeTab === 'settings' && (
        <>
          <section className="section">
            <h2>타이머 타입 관리</h2>
            <div className="field">
              <label>현재 타이머 타입</label>
              <div className="current-types">
                {settings.timerTypes.map((t) => (
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

          <section className="section">
            <h2>기본 설정</h2>
            <div className="field">
              <label>기본 타이머 라벨</label>
              <input
                type="text"
                value={settings.defaultLabel}
                onChange={(e) => updateSettings({ defaultLabel: e.target.value })}
              />
            </div>
            <div className="field">
              <label>
                <input
                  type="checkbox"
                  checked={settings.showFloating}
                  onChange={(e) => updateSettings({ showFloating: e.target.checked })}
                />{' '}
                화면에 타이머 보이기
              </label>
            </div>
            <div className="field">
              <label>
                <input
                  type="checkbox"
                  checked={settings.enableNotifications}
                  onChange={(e) =>
                    updateSettings({ enableNotifications: e.target.checked })
                  }
                />{' '}
                시스템 알림 전송
              </label>
            </div>
            <div className="field">
              <label>
                <input
                  type="checkbox"
                  checked={settings.enableSound}
                  onChange={(e) =>
                    updateSettings({ enableSound: e.target.checked })
                  }
                />{' '}
                종료 알림 소리
              </label>
              {settings.enableSound && (
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.volume}
                  onChange={(e) =>
                    updateSettings({ volume: Number(e.target.value) })
                  }
                />
              )}
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
                placeholder={settings.defaultLabel}
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
                {settings.timerTypes.map((t) => (
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
            <button className="primary" onClick={handleAddTimer}>
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
                        {' '}-
                        {(() => {
                          const rem = Math.max(0, t.endTime - now);
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

