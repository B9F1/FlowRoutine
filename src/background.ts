// globalThis.endedGuard 타입 선언
declare global {
  interface GlobalThis {
    endedGuard?: Map<string, number>;
  }
}

import type { Timer, Settings } from "./types";
declare const chrome: any;

declare global {
  // eslint-disable-next-line no-var
  var endedGuard: Map<string, number> | undefined;
}

let timers: Timer[] = [];
let settings: Settings = {
  timerTypes: [
    { name: "학습", color: "#3498db" },
    { name: "업무", color: "#2ecc71" },
    { name: "브레이크", color: "#e74c3c" },
  ],
  showFloating: true,
  enableNotifications: true,
  enableSound: true,
  volume: 1,
};

chrome.storage?.local.get(["timers", "settings"], (data: any) => {
  if (data && Array.isArray(data.timers)) {
    timers = data.timers;
  }
  if (data && data.settings) {
    settings = { ...settings, ...data.settings };
  }
});

function save() {
  chrome.storage?.local.set({ timers, settings });
}

function broadcastTimers() {
  const running = settings.showFloating ? timers.filter((t) => t.running) : [];
  chrome.tabs.query({}, (tabs: any[]) => {
    tabs.forEach((tab) => {
      if (tab.id !== undefined) {
        const timersForTab = tab.active ? running : [];
        chrome.tabs.sendMessage(tab.id, { type: "timers", timers: timersForTab });
      }
    });
  });
}

chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: (res?: any) => void) => {
  switch (message.type) {
    case "getTimers":
      sendResponse({ timerData: timers });
      break;
    case "addTimer":
      timers.push(message.timer);
      save();
      broadcastTimers();
      sendResponse({ timerData: timers });
      break;
    case "startTimer":
      timers = timers.map((t) =>
        t.id === message.id
          ? {
              ...t,
              running: true,
              endTime: Date.now() + t.duration * 60 * 1000,
            }
          : t
      );
      save();
      broadcastTimers();
      sendResponse({ timerData: timers });
      break;
    case "stopTimer":
      timers = timers.map((t) => (t.id === message.id ? { ...t, running: false, endTime: undefined } : t));
      save();
      broadcastTimers();
      sendResponse({ timerData: timers });
      break;
    case "timerEnded": {
      // 중복 알림 방지: endedGuard 사용
      if (!endedGuard) endedGuard = new Map();
      const guard = endedGuard!;
      const now = Date.now();
      if (guard.get(message.id) && now - guard.get(message.id)! < 3000) {
        sendResponse({ timerData: timers });
        break;
      }
      guard.set(message.id, now);
      timers = timers.map((t) => (t.id === message.id ? { ...t, running: false, endTime: undefined } : t));
      save();
      broadcastTimers();
      const finished = timers.find((t) => t.id === message.id);
      chrome.storage?.local.get(["stats"], (data: any) => {
        const stats = Array.isArray(data?.stats) ? data.stats : [];
        if (finished) {
          stats.push({ label: finished.label, duration: finished.duration, timestamp: now });
          chrome.storage?.local.set({ stats });
        }
      });
      if (settings.enableNotifications) {
        chrome.notifications?.create(`timer-${message.id}`, {
          type: "basic",
          iconUrl: chrome.runtime.getURL("assets/icons/logo-FlowRoutine.png"),
          title: "타이머 종료",
          message: `${message.label} 타이머가 종료되었습니다.`,
        });
      }
      if (settings.enableSound) {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs: any[]) => {
          tabs.forEach((tab) => {
            // 실제 알림 사운드 처리 코드 필요시 여기에 작성
          });
        });
        chrome.runtime.sendMessage({ type: "playSound", volume: settings.volume });
      }
      sendResponse({ timerData: timers });
      break;
    }
    case "moveTimer":
      timers = timers.map((t) => (t.id === message.id ? { ...t, x: message.x, y: message.y } : t));
      save();
      broadcastTimers();
      sendResponse({ timerData: timers });
      break;
    case "removeTimer":
      timers = timers.filter((t) => t.id !== message.id);
      save();
      broadcastTimers();
      sendResponse({ timerData: timers });
      break;
    case "getSettings":
      sendResponse(settings);
      break;
    case "updateSettings":
      settings = { ...settings, ...message.updates };
      save();
      broadcastTimers();
      sendResponse(settings);
      break;
    default:
      sendResponse({ timerData: timers });
  }
  return true;
});

chrome.tabs.onActivated.addListener(() => broadcastTimers());
