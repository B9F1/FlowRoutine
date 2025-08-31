// src/contentScript.js
// 현재 탭에 floating 타이머 엘리먼트 생성 예시
console.log('contentScript loaded');

function createFloatingTimers(timers) {
  // 기존 floating 타이머 모두 제거
  document.querySelectorAll('.flowroutine-floating-timer').forEach((el) => el.remove());
  timers.forEach((timer, idx) => {
    if (!timer.running) return;
    let timerDiv = document.createElement('div');
    timerDiv.className = 'flowroutine-floating-timer';
    timerDiv.style.position = 'fixed';
    timerDiv.style.top = '20px';
    timerDiv.style.right = `${20 + idx * 180}px`;
    timerDiv.style.zIndex = '9999';
    timerDiv.style.background = '#222';
    timerDiv.style.color = '#fff';
    timerDiv.style.padding = '12px 24px';
    timerDiv.style.borderRadius = '8px';
    timerDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    timerDiv.innerText = `${timer.label} (${timer.duration}분)`;
    document.body.appendChild(timerDiv);
  });
}

chrome.runtime.sendMessage({ type: 'getTimers' }, (response) => {
  if (response && Array.isArray(response.timerData)) {
    createFloatingTimers(response.timerData);
  }
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'SHOW_TIMER' && message.timer) {
      // 기존 floating 타이머 모두 제거
      document.querySelectorAll('.flowroutine-floating-timer').forEach((el) => el.remove());
      // 새 타이머 엘리먼트 생성
      let timerDiv = document.createElement('div');
      timerDiv.className = 'flowroutine-floating-timer';
      timerDiv.style.position = 'fixed';
      timerDiv.style.bottom = '20px';
      timerDiv.style.right = '20px';
      timerDiv.style.zIndex = '9999';
      timerDiv.style.background = '#fff';
      timerDiv.style.color = '#222';
      timerDiv.style.padding = '12px 24px';
      timerDiv.style.borderRadius = '8px';
      timerDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      timerDiv.style.border = '1px solid #ccc';
      timerDiv.innerText = `⏱ ${message.timer.label} (${message.timer.duration}분)`;
      document.body.appendChild(timerDiv);
    }
  if (message.type === 'timers' && Array.isArray(message.timers)) {
    createFloatingTimers(message.timers);
  }
  if (message.type === 'SET_TIMER') {
    if (message.data) {
      createFloatingTimers([message.data]);
    } else {
      createFloatingTimers([]);
    }
  }
});
