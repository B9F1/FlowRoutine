// src/background.js
// 확장 프로그램의 타이머 상태 관리 및 탭 이동 시 타이머 데이터 전달

function registerContentScript() {
  chrome.scripting.registerContentScripts(
    [
      {
        id: 'flowroutine-content-script',
        matches: ['<all_urls>'],
        js: ['contentScript.js'],
        runAt: 'document_end',
      },
    ],
    () => {
      if (chrome.runtime.lastError) {
        console.warn('Failed to register content script:', chrome.runtime.lastError);
      } else {
        console.log('FlowRoutine content script registered');
        injectContentScriptToAllTabs();
      }
    }
  );
}

function injectContentScript(tabId) {
  chrome.scripting.executeScript(
    { target: { tabId }, files: ['contentScript.js'] },
    () => {
      if (chrome.runtime.lastError) {
        // ignore injection errors (e.g., chrome pages)
      }
    }
  );
}

function injectContentScriptToAllTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        injectContentScript(tab.id);
      }
    });
  });
}

function initializeActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      currentTabId = tabs[0].id;
      injectContentScript(currentTabId);
      broadcastTimers();
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('FlowRoutine background script loaded');
  registerContentScript();
  initializeActiveTab();
  startTimerTick();
});

// Also register on startup to handle service worker restarts.
chrome.runtime.onStartup?.addListener(() => {
  registerContentScript();
  initializeActiveTab();
  startTimerTick();
});

let timers = [];
let labelTypeMap = {};
let settings = {
  defaultLabel: 'work-timer',
  timerTypes: [
    { name: '학습', color: '#3498db' },
    { name: '업무', color: '#2ecc71' },
    { name: '브레이크', color: '#e74c3c' },
  ],
  showFloating: true,
  enableNotifications: true,
  enableSound: true,
  volume: 1,
};
let currentTabId;
let statsRecords = [];
const endedGuard = new Map(); // id -> last ended timestamp

function handleTimerEnded(messageOrTimer) {
  const nowTs = Date.now();
  const idKey = String(messageOrTimer.id);
  const last = endedGuard.get(idKey);
  if (last && nowTs - last < 10000) {
    return false; // duplicate within window
  }
  endedGuard.set(idKey, nowTs);
  // prune occasionally
  if (endedGuard.size > 1000) {
    const cutoff = nowTs - 600000;
    for (const [k, v] of endedGuard) if (v < cutoff) endedGuard.delete(k);
  }
  timers = timers.map(t => String(t.id) === idKey ? { ...t, running: false, endTime: undefined } : t);
  save();
  broadcastTimers();
  const finished = timers.find(t => String(t.id) === idKey) || messageOrTimer;
  if (finished) {
    const rec = {
      label: String(finished.label || '').trim(),
      duration: Number(finished.duration || 0),
      timestamp: nowTs,
      type: finished.type ? String(finished.type).trim() : finished.type,
    };
    // de-dup by label within 2s window
    let isDup = false;
    for (let i = statsRecords.length - 1; i >= 0; i--) {
      const r = statsRecords[i];
      if (r.label === rec.label && (nowTs - Number(r.timestamp)) < 2000) { isDup = true; break; }
      if ((nowTs - Number(r.timestamp)) >= 2000) break;
    }
    if (!isDup) statsRecords.push(rec);
    if (rec.label && rec.type) {
      labelTypeMap[rec.label] = rec.type;
      save();
    }
    chrome.storage?.local.set({ stats: statsRecords });
  }
  if (settings.enableNotifications) {
    try {
      chrome.notifications?.create(`timer-${idKey}-${nowTs}-${Math.random().toString(36).slice(2,6)}`, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icons/logo-FlowRoutine.png'),
        title: '타이머 종료',
        message: `${messageOrTimer.label} 타이머가 종료되었습니다.`,
      });
    } catch {}
  }
  if (settings.enableSound) {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'playSound', volume: settings.volume });
          }
        });
      });
    } catch {}
  }
  return true;
}

function startTimerTick() {
  try {
    setInterval(() => {
      const now = Date.now();
      const due = timers.filter(t => t.running && typeof t.endTime === 'number' && t.endTime <= now);
      if (due.length) {
        due.forEach((t) => handleTimerEnded(t));
      }
    }, 1000);
  } catch {}
}

chrome.storage?.local.get(['timers', 'settings', 'labelTypeMap', 'stats'], (data) => {
  if (data && Array.isArray(data.timers)) {
    timers = data.timers;
  }
  if (data && data.settings) {
    settings = { ...settings, ...data.settings };
  }
  if (data && data.labelTypeMap && typeof data.labelTypeMap === 'object') {
    labelTypeMap = {};
    Object.entries(data.labelTypeMap).forEach(([k, v]) => {
      const key = String(k || '').trim();
      const val = typeof v === 'string' ? v.trim() : v;
      if (key && val) labelTypeMap[key] = val;
    });
  }
  // Backfill missing type in existing stats entries where possible
  try {
    let statsLoaded = Array.isArray(data?.stats) ? data.stats : [];
    let changed = false;
    const typeByLabel = { ...labelTypeMap };
    timers.forEach((t) => {
      if (t && t.label && t.type) typeByLabel[t.label] = t.type;
    });
    const fallbackByLabel = {
      '1': '학습', '2': '학습', '3': '학습',
      '11': '업무', '22': '업무', '33': '업무',
      '111': '브레이크', '222': '브레이크', '333': '브레이크',
    };
    statsLoaded.forEach((r) => {
      if (!r) return;
      if (typeof r.label === 'string') r.label = r.label.trim();
      if (typeof r.type === 'string') r.type = r.type.trim();
      if (!r.type && r.label) {
        const mapped = typeByLabel[r.label] || fallbackByLabel[r.label];
        if (mapped) {
          r.type = mapped;
          changed = true;
        }
      }
    });
    statsRecords = statsLoaded;
    if (changed) {
      chrome.storage?.local.set({ stats: statsRecords, labelTypeMap });
    }
  } catch {}
});

function save() {
  chrome.storage?.local.set({ timers, settings, labelTypeMap });
}

function broadcastTimers() {
  const running = settings.showFloating ? timers.filter(t => t.running) : [];
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        const timersForTab = tab.active ? running : [];
        chrome.tabs.sendMessage(tab.id, { type: 'timers', timers: timersForTab }, () => {
          if (chrome.runtime.lastError) {
            // ignore missing receivers
          }
        });
      }
    });
  });
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  const { tabId } = activeInfo;
  if (currentTabId && currentTabId !== tabId) {
    chrome.tabs.sendMessage(
      currentTabId,
      { type: 'timers', timers: [] },
      () => {
        if (chrome.runtime.lastError) {
          // ignore if tab doesn't have the script
        }
      }
    );
  }
  currentTabId = tabId;
  injectContentScript(tabId);
  broadcastTimers();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SHOW_TIMER' && message.timer) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'SHOW_TIMER', timer: message.timer });
      }
    });
    sendResponse({ status: 'ok' });
    return true;
  }
  if (message.type === 'addTimer') {
    timers.push(message.timer);
    if (message.timer && message.timer.label && message.timer.type) {
      const lbl = String(message.timer.label).trim();
      const typ = String(message.timer.type).trim();
      if (lbl && typ) labelTypeMap[lbl] = typ;
    }
    save();
    broadcastTimers();
    sendResponse({ timerData: timers });
    return true;
  }
  if (message.type === 'getTimers') {
    sendResponse({ timerData: timers });
    return true;
  }
  if (message.type === 'removeTimer') {
    timers = timers.filter(t => String(t.id) !== String(message.id));
    save();
    broadcastTimers();
    sendResponse({ timerData: timers });
    return true;
  }
  if (message.type === 'startTimer') {
    timers = timers.map(t => String(t.id) === String(message.id) ? { ...t, running: true, endTime: Date.now() + t.duration * 60 * 1000 } : t);
    // clear end guard for this id when starting again
    try { endedGuard.delete(String(message.id)); } catch {}
    save();
    broadcastTimers();
    sendResponse({ timerData: timers });
    return true;
  }
  if (message.type === 'stopTimer') {
    timers = timers.map(t => String(t.id) === String(message.id) ? { ...t, running: false, endTime: undefined } : t);
    save();
    broadcastTimers();
    sendResponse({ timerData: timers });
    return true;
  }
  if (message.type === 'timerEnded') {
    handleTimerEnded({ id: message.id, label: message.label });
    sendResponse({ timerData: timers });
    return true;
  }
  if (message.type === 'moveTimer') {
    timers = timers.map(t => String(t.id) === String(message.id) ? { ...t, x: message.x, y: message.y } : t);
    save();
    broadcastTimers();
    sendResponse({ timerData: timers });
    return true;
  }
  if (message.type === 'getSettings') {
    sendResponse(settings);
    return true;
  }
  if (message.type === 'updateSettings') {
    settings = { ...settings, ...message.updates };
    save();
    broadcastTimers();
    sendResponse(settings);
    return true;
  }
  // SET_TIMER 처리 (floating 표시용)
  if (message.type === 'SET_TIMER') {
    // 기존 SET_TIMER 로직 유지 (floating 표시용)
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'SET_TIMER', data: message.data }, () => {
            if (chrome.runtime.lastError) {
              // Receiving end does not exist 에러 무시
            }
          });
        }
      });
    });
    sendResponse({ status: 'ok' });
    return true;
  }
  // 기타 메시지에도 항상 sendResponse 호출
  sendResponse({ timerData: timers });
  return true;
});
