import React, { useEffect, useState } from 'react';
import TimerModal from './components/TimerModal';
import FloatingTimer from './components/FloatingTimer';
import type { Timer, Settings } from './types';
declare const chrome: any;

function App() {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [showModal, setShowModal] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'getTimers' }, (response: any) => {
      if (response && Array.isArray(response.timerData)) {
        setTimers(response.timerData);
      } else {
        setTimers([]);
      }
    });
    chrome.runtime.sendMessage({ type: 'getSettings' }, (res: any) => {
      setSettings(res);
    });
    const listener = (message: any) => {
      if (message?.type === 'playSound') {
        try {
          const audio = new Audio(chrome.runtime.getURL('assets/sounds/bell_01.mp3'));
          audio.volume = Math.max(0, Math.min(1, Number(message.volume ?? 1)));
          audio.play().catch(() => {});
        } catch {}
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => {
      try { chrome.runtime.onMessage.removeListener(listener); } catch {}
    };
  }, []);

  const send = (message: any) =>
    chrome.runtime.sendMessage(message, (response: any) => {
      if (response && Array.isArray(response.timerData)) {
        setTimers(response.timerData);
      } else {
        setTimers([]);
      }
    });

  const addTimer = (timer: Timer) => {
    send({ type: 'addTimer', timer });
    // background에 타이머 데이터 동기화
    chrome.runtime.sendMessage({ type: 'SET_TIMER', data: timer }, () => {});
    // background.js에 SHOW_TIMER 메시지 요청 (MV3 권장 방식)
    chrome.runtime.sendMessage({ type: 'SHOW_TIMER', timer });
  };
  const startTimer = (id: number) => {
    send({ type: 'startTimer', id });
    const t = timers.find((t) => t.id === id);
    if (t) chrome.runtime.sendMessage({ type: 'SET_TIMER', data: { ...t, running: true } }, () => {});
  };
  const stopTimer = (id: number) => {
    send({ type: 'stopTimer', id });
    const t = timers.find((t) => t.id === id);
    if (t) chrome.runtime.sendMessage({ type: 'SET_TIMER', data: { ...t, running: false } }, () => {});
  };
  const removeTimer = (id: number) => {
    send({ type: 'removeTimer', id });
    // background에 타이머 데이터 초기화
    chrome.runtime.sendMessage({ type: 'SET_TIMER', data: null }, () => {});
  };

  const updateSettings = (updates: Partial<Settings>) => {
    chrome.runtime.sendMessage({ type: 'updateSettings', updates }, (res: any) => {
      setSettings(res);
    });
  };

  return (
    <div className="app">
      {/* FloatingTimer 렌더링 제거: 웹페이지에는 contentScript.js가 직접 생성 */}
      {showModal && settings && (
        <TimerModal
          timers={timers}
          addTimer={addTimer}
          startTimer={startTimer}
          stopTimer={stopTimer}
          removeTimer={removeTimer}
          onClose={() => setShowModal(false)}
          settings={settings}
          updateSettings={updateSettings}
        />
      )}
    </div>
  );
}

export default App;
