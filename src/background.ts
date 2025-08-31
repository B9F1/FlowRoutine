import type { Timer } from './types';
declare const chrome: any;

let timers: Timer[] = [];

chrome.storage?.local.get('timers', (data: any) => {
  if (data && Array.isArray(data.timers)) {
    timers = data.timers;
  }
});

function save() {
  chrome.storage?.local.set({ timers });
}

function broadcast() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
    const running = timers.filter((t) => t.running);
    tabs.forEach((tab) => {
      if (tab.id !== undefined) {
        chrome.tabs.sendMessage(tab.id, { type: 'timers', timers: running });
      }
    });
  });
}

chrome.runtime.onMessage.addListener(
  (
    message: any,
    _sender: any,
    sendResponse: (res?: Timer[]) => void
  ) => {
    switch (message.type) {
      case 'getTimers':
        sendResponse(timers);
        break;
      case 'addTimer':
        timers.push(message.timer);
        save();
        broadcast();
        sendResponse(timers);
        break;
      case 'startTimer':
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
        broadcast();
        sendResponse(timers);
        break;
      case 'stopTimer':
        timers = timers.map((t) =>
          t.id === message.id
            ? { ...t, running: false, endTime: undefined }
            : t
        );
        save();
        broadcast();
        sendResponse(timers);
        break;
      case 'removeTimer':
        timers = timers.filter((t) => t.id !== message.id);
        save();
        broadcast();
        sendResponse(timers);
        break;
      default:
        sendResponse(timers);
    }
    return true;
  }
);

chrome.tabs.onActivated.addListener(() => broadcast());
