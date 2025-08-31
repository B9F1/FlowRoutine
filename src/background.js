// src/background.js
// 확장 프로그램의 타이머 상태 관리 및 탭 이동 시 타이머 데이터 전달

chrome.runtime.onInstalled.addListener(() => {
  console.log('FlowRoutine background script loaded');
});

let timers = [];

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
      // 모든 탭에 타이머 목록 브로드캐스트
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'timers', timers }, () => {
              if (chrome.runtime.lastError) {
                // Receiving end does not exist 에러 무시
              }
            });
          }
        });
      });
      sendResponse({ timerData: timers });
      return true;
  }
  if (message.type === 'getTimers') {
    sendResponse({ timerData: timers });
    return true;
  }
  if (message.type === 'removeTimer') {
      timers = timers.filter(t => t.id !== message.id);
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'timers', timers }, () => {
              if (chrome.runtime.lastError) {
                // Receiving end does not exist 에러 무시
              }
            });
          }
        });
      });
      sendResponse({ timerData: timers });
      return true;
  }
  if (message.type === 'startTimer') {
      timers = timers.map(t => t.id === message.id ? { ...t, running: true, endTime: Date.now() + t.duration * 60 * 1000 } : t);
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'timers', timers }, () => {
              if (chrome.runtime.lastError) {
                // Receiving end does not exist 에러 무시
              }
            });
          }
        });
      });
      sendResponse({ timerData: timers });
      return true;
  }
  if (message.type === 'stopTimer') {
      timers = timers.map(t => t.id === message.id ? { ...t, running: false, endTime: undefined } : t);
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'timers', timers }, () => {
              if (chrome.runtime.lastError) {
                // Receiving end does not exist 에러 무시
              }
            });
          }
        });
      });
      sendResponse({ timerData: timers });
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
