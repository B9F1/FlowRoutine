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
});

// Also register on startup to handle service worker restarts.
chrome.runtime.onStartup?.addListener(() => {
  registerContentScript();
  initializeActiveTab();
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

chrome.storage?.local.get(['timers', 'settings', 'labelTypeMap', 'stats'], (data) => {
  if (data && Array.isArray(data.timers)) {
    timers = data.timers;
  }
  if (data && data.settings) {
    settings = { ...settings, ...data.settings };
  }
  if (data && data.labelTypeMap && typeof data.labelTypeMap === 'object') {
    labelTypeMap = data.labelTypeMap;
  }
  // Backfill missing type in existing stats entries where possible
  try {
    const stats = Array.isArray(data?.stats) ? data.stats : [];
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
    stats.forEach((r) => {
      if (!r || r.type) return;
      const lbl = r.label;
      if (!lbl) return;
      const mapped = typeByLabel[lbl] || fallbackByLabel[lbl];
      if (mapped) {
        r.type = mapped;
        changed = true;
      }
    });
    if (changed) {
      chrome.storage?.local.set({ stats });
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
      labelTypeMap[message.timer.label] = message.timer.type;
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
    timers = timers.map(t => String(t.id) === String(message.id) ? { ...t, running: false, endTime: undefined } : t);
    save();
    broadcastTimers();
    const finished = timers.find(t => String(t.id) === String(message.id));
    chrome.storage?.local.get(['stats'], (data) => {
      const stats = Array.isArray(data?.stats) ? data.stats : [];
      if (finished) {
        stats.push({
          label: finished.label,
          duration: finished.duration,
          timestamp: Date.now(),
          type: finished.type,
        });
        if (finished.label && finished.type) {
          labelTypeMap[finished.label] = finished.type;
          save();
        }
        chrome.storage?.local.set({ stats });
      }
    });
    if (settings.enableNotifications) {
      chrome.notifications?.create(`timer-${String(message.id)}`, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icons/logo-FlowRoutine.png'),
        title: '타이머 종료',
        message: `${message.label} 타이머가 종료되었습니다.`,
      });
    }
    if (settings.enableSound) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'playSound', volume: settings.volume });
          }
        });
      });
    }
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
