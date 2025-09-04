import React, { useEffect, useState } from "react";
import type { Timer, Settings, StatRecord } from "../types";
import StatsBarChart from "./StatsBarChart";
declare const chrome: any;

interface Props {
  timers: Timer[];
  addTimer: (timer: Timer) => void;
  startTimer: (id: string) => void;
  stopTimer: (id: string) => void;
  removeTimer: (id: string) => void;
  onClose: () => void;
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
}

export default function TimerModal({ timers, addTimer, startTimer, stopTimer, removeTimer, onClose, settings, updateSettings }: Props) {
  const colors = ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#1abc9c", "#3498db", "#9b59b6", "#34495e"];

  const [activeTab, setActiveTab] = useState<"list" | "settings" | "stats">("list");
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState(colors[0]);

  const [timerLabel, setTimerLabel] = useState("");
  const [timerType, setTimerType] = useState(settings.timerTypes[0]?.name || "");
  const [duration, setDuration] = useState(60); // minutes
  const [now, setNow] = useState(Date.now());
  const [adding, setAdding] = useState(false);
  const [records, setRecords] = useState<StatRecord[]>([]);
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [startHour, setStartHour] = useState(0);
  const [endHour, setEndHour] = useState(24);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Load stats once for the Stats tab
  useEffect(() => {
    chrome.storage?.local.get(["stats"], (data: any) => {
      if (Array.isArray(data?.stats)) setRecords(data.stats as StatRecord[]);
    });
  }, []);

  const handleAddType = () => {
    if (!newTypeName.trim()) return;
    const types = [...settings.timerTypes, { name: newTypeName, color: newTypeColor }];
    updateSettings({ timerTypes: types });
    setNewTypeName("");
  };

  const handleRemoveType = (name: string) => {
    const types = settings.timerTypes.filter((t) => t.name !== name);
    updateSettings({ timerTypes: types });
    if (timerType === name) setTimerType("");
  };

  const handleAddTimer = () => {
    if (!timerLabel.trim() || !timerType || duration <= 0) return;
    // 중복 체크
    if (timers.some((t) => t.label === timerLabel.trim())) return;
    const color = settings.timerTypes.find((t) => t.name === timerType)?.color || "#333";
    addTimer({
      id: (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`),
      label: timerLabel.trim(),
      type: timerType,
      duration,
      running: false,
      color,
    });
    setTimerLabel("");
    setTimerType(settings.timerTypes[0]?.name || "");
  };

  return (
    <div className="w-[360px] h-[600px] bg-background border border-border rounded-none shadow-strong overflow-hidden">
      {/* Header */}
      <div className="h-16 bg-card border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="w-4 h-4 rounded-full bg-primary block" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-sm">FlowRoutine</h1>
            <p className="text-xs text-muted-foreground">Focus & Flow</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full h-12 bg-card/50 border-b border-border p-1 flex">
        <button
          className={`flex-1 text-xs rounded-md px-3 py-1.5 transition data-[active=true]:bg-background data-[active=true]:shadow-sm ${
            activeTab === "list" ? "bg-background shadow-sm" : "text-muted-foreground hover:bg-muted/40"
          }`}
          data-active={activeTab === "list"}
          onClick={() => setActiveTab("list")}
        >
          타이머 목록
        </button>
        <button
          className={`flex-1 text-xs rounded-md px-3 py-1.5 transition data-[active=true]:bg-background data-[active=true]:shadow-sm ${
            activeTab === "settings" ? "bg-background shadow-sm" : "text-muted-foreground hover:bg-muted/40"
          }`}
          data-active={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
        >
          설정
        </button>
        <button
          className={`flex-1 text-xs rounded-md px-3 py-1.5 transition ${
            activeTab === "stats" ? "bg-background shadow-sm" : "text-muted-foreground hover:bg-muted/40"
          }`}
          onClick={() => setActiveTab("stats")}
        >
          통계
        </button>
      </div>

      {/* Settings */}
      {activeTab === "settings" && (
        <>
          <section className="h-[calc(100%-7rem)] p-4 overflow-y-auto space-y-3">
            <h2 className="text-sm font-semibold text-foreground">기본 타이머 관리</h2>
            <div className="flex flex-wrap gap-2">
              {settings.timerTypes.map((t) => (
                <span
                  key={t.name}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white"
                  style={{ backgroundColor: t.color }}
                >
                  {t.name}
                  <button className="opacity-80 hover:opacity-100" onClick={() => handleRemoveType(t.name)}>
                    x
                  </button>
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2 col-span-2">
                <label className="text-xs text-muted-foreground">새 유형 이름</label>
                <input
                  className="px-3 py-2 rounded-md bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="ex) Focus"
                />
              </div>
              <div className="flex flex-col gap-2 col-span-2">
                <label className="text-xs text-muted-foreground">색상 선택</label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`w-6 h-6 rounded-full border ${newTypeColor === c ? "ring-2 ring-ring" : ""}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewTypeColor(c)}
                      aria-label={`color ${c}`}
                    />
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <button
                  className="inline-flex items-center px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 text-sm"
                  onClick={handleAddType}
                >
                  유형 추가
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">플로팅 타이머 표시</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="showFloating"
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.showFloating}
                  onChange={(e) => updateSettings({ showFloating: e.target.checked })}
                />
                <div className="w-10 h-6 bg-muted rounded-full peer-checked:bg-primary transition" />
                <span className="absolute left-1 top-1 w-4 h-4 bg-background rounded-full transition peer-checked:translate-x-4" />
              </label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">알림 보내기</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="enableNotifications"
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.enableNotifications}
                  onChange={(e) => updateSettings({ enableNotifications: e.target.checked })}
                />
                <div className="w-10 h-6 bg-muted rounded-full peer-checked:bg-primary transition" />
                <span className="absolute left-1 top-1 w-4 h-4 bg-background rounded-full transition peer-checked:translate-x-4" />
              </label>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">종료 소리</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="enableSound"
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.enableSound}
                    onChange={(e) => updateSettings({ enableSound: e.target.checked })}
                  />
                  <div className="w-10 h-6 bg-muted rounded-full peer-checked:bg-primary transition" />
                  <span className="absolute left-1 top-1 w-4 h-4 bg-background rounded-full transition peer-checked:translate-x-4" />
                </label>
              </div>
              {settings.enableSound && (
                <>
                  <input
                    className="range"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={settings.volume}
                    onChange={(e) => updateSettings({ volume: Number(e.target.value) })}
                  />
                  <div className="text-xs text-center text-muted-foreground">{Math.round((settings.volume ?? 0) * 100)}%</div>
                </>
              )}
            </div>
          </section>
        </>
      )}

      {/* Stats inside modal */}
      {activeTab === "stats" && (
        <section className="h-[calc(100%-7rem)] p-4 overflow-y-auto space-y-3">
          <div className="mb-2">
            <h2 className="text-sm font-semibold text-foreground">통계</h2>
          </div>
          <div className="mb-2">
            <label className="block mb-1 text-xs text-muted-foreground">기간 선택</label>
            <select
              className="px-3 py-2 rounded-md bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring w-full"
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
            >
              <option value="day">일별</option>
              <option value="week">주별</option>
              <option value="month">월별</option>
            </select>
          </div>
          <div className="mb-2 flex gap-2">
            <div className="flex-1">
              <label className="block mb-1 text-xs text-muted-foreground">시작 시간</label>
              <input
                className="px-3 py-2 rounded-md bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring w-full"
                type="number"
                min={0}
                max={23}
                placeholder="시작"
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                title="시작 시간"
              />
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-xs text-muted-foreground">종료 시간</label>
              <input
                className="px-3 py-2 rounded-md bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring w-full"
                type="number"
                min={1}
                max={24}
                placeholder="종료"
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                title="종료 시간"
              />
            </div>
          </div>
          {(() => {
            const nowMs = Date.now();
            const range = { day: 24 * 60 * 60 * 1000, week: 7 * 24 * 60 * 60 * 1000, month: 30 * 24 * 60 * 60 * 1000 }[period];
            const totals: Record<string, number> = {};
            records.forEach((r) => {
              if (nowMs - r.timestamp <= range) {
                const h = new Date(r.timestamp).getHours();
                if (h >= startHour && h < endHour) totals[r.label] = (totals[r.label] || 0) + r.duration;
              }
            });
            const data = {
              labels: Object.keys(totals),
              datasets: [{ label: "집중 시간(분)", data: Object.values(totals), backgroundColor: "rgba(34,197,94,0.5)" }],
            };
            const options = { indexAxis: "y", responsive: true, plugins: { legend: { display: false }, title: { display: false } } };
            return <StatsBarChart data={data} options={options} />;
          })()}
        </section>
      )}

      {/* Timer list */}
      {activeTab === "list" && (
        <>
          <section className="h-[calc(100%-7rem)] p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground">타이머 목록</h2>
            </div>
            <h2 className="sr-only">타이머 목록</h2>

            {!adding && (
              <div className="my-4 ">
                <button
                  className="w-full h-12 border-2 border-dashed border-border rounded-md text-sm text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
                  onClick={() => setAdding(true)}
                >
                  + 새 타이머 추가
                </button>
              </div>
            )}
            {adding && (
              <div className="my-4 bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-muted-foreground">
                    타이머 라벨 <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="px-3 py-2 rounded-md bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    type="text"
                    value={timerLabel}
                    onChange={(e) => setTimerLabel(e.target.value)}
                    placeholder="타이머 이름을 입력하세요"
                  />
                  {!timerLabel.trim() && <span className="text-xs text-red-500 mt-1">타이머 이름을 입력하세요.</span>}
                  {timerLabel.trim() && timers.some((t) => t.label === timerLabel.trim()) && (
                    <span className="text-xs text-red-500 mt-1">이미 존재하는 이름입니다.</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-muted-foreground">타입</label>
                  <select
                    className="px-3 py-2 rounded-md bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
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
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-muted-foreground">지속 시간: {duration}m</label>
                  <input
                    className="range"
                    type="range"
                    min="1"
                    max="60"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex items-center px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 text-sm"
                    disabled={!timerLabel.trim() || timers.some((t) => t.label === timerLabel.trim())}
                    onClick={() => {
                      handleAddTimer();
                      setAdding(false);
                    }}
                  >
                    추가
                  </button>
                  <button
                    className="inline-flex items-center px-3 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm"
                    onClick={() => setAdding(false)}
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {timers.length === 0 && <p className="text-sm text-muted-foreground">등록된 타이머가 없습니다. 아래에서 추가하세요.</p>}
            <div className="grid grid-cols-2 gap-3">
              {timers.map((t) => {
                const rem = Math.max(0, (t.endTime ?? 0) - now);
                const m = Math.floor(rem / 60000)
                  .toString()
                  .padStart(2, "0");
                const s = Math.floor((rem % 60000) / 1000)
                  .toString()
                  .padStart(2, "0");
                const isActive = !!t.running;
                return (
                  <div
                    key={t.id}
                    className={`relative bg-card border border-border rounded-xl p-4 transition hover:shadow-soft hover-lift ${
                      isActive ? "ring-2 ring-primary shadow-medium" : ""
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground mb-1">{isActive ? `${m}:${s}` : `${t.duration}m`}</div>
                      <div className="text-xs text-muted-foreground mb-2">{t.label}</div>
                      <div className="flex items-center justify-center gap-2">
                        {t.running ? (
                          <button
                            className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            onClick={() => stopTimer(t.id)}
                          >
                            중지
                          </button>
                        ) : (
                          <button
                            className="text-xs px-2 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90"
                            onClick={() => startTimer(t.id)}
                          >
                            시작
                          </button>
                        )}
                        <button
                          className="text-xs px-2 py-1 rounded-md bg-destructive text-destructive-foreground hover:opacity-90"
                          onClick={() => removeTimer(t.id)}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 rounded-b-xl" style={{ background: t.color }} />
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
