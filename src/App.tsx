import React, { useEffect, useState } from 'react';
import TimerModal from './components/TimerModal';
import FloatingTimer from './components/FloatingTimer';
import type { Timer } from './types';
declare const chrome: any;

function App() {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [showModal, setShowModal] = useState(true);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'getTimers' }, (response: any) => {
      if (response && Array.isArray(response.timerData)) {
        setTimers(response.timerData);
      } else {
        setTimers([]);
      }
    });
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

  // 실행 중인 타이머 찾기
  const runningTimer = timers.find((t) => t.running);

  return (
    <div className="app">
      {/* FloatingTimer 렌더링 제거: 웹페이지에는 contentScript.js가 직접 생성 */}
      {showModal && (
        <TimerModal
          timers={timers}
          addTimer={addTimer}
          startTimer={startTimer}
          stopTimer={stopTimer}
          removeTimer={removeTimer}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

export default App;
