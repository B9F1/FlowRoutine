// src/contentScript.js
// 현재 탭에 floating 타이머 엘리먼트 생성 예시
console.log('contentScript loaded');

function createFloatingTimers(timers) {
  // 기존 floating 타이머 모두 제거
  // 기존 floatingTimer 중, running이 아닌 타이머 엘리먼트만 제거
  // running=true인 타이머만 floatingTimer로 생성 (중복 방지)
  // 기존 floatingTimer 중 running이 아닌 타이머 또는 중복된 엘리먼트 제거
  const runningKeys = timers.filter(t => t.running).map(t => `${t.label}_${t.duration}`);
  const seen = new Set();
  document.querySelectorAll('.flowroutine-floating-timer').forEach((el) => {
    const key = `${el.dataset.label}_${el.dataset.duration}`;
    if (!runningKeys.includes(key) || seen.has(key)) {
      el.remove();
    } else {
      seen.add(key);
    }
  });

  timers.forEach((timer, idx) => {
    if (!timer.running) return;
    const key = `${timer.label}_${timer.duration}`;
    // 이미 floatingTimer가 있으면 생성하지 않음
    if (document.querySelector(`.flowroutine-floating-timer[data-label="${timer.label}"][data-duration="${timer.duration}"]`)) return;
    let timerDiv = document.createElement('div');
    timerDiv.className = 'flowroutine-floating-timer';
    timerDiv.dataset.label = timer.label;
    timerDiv.dataset.duration = timer.duration;
    // 강력한 스타일 적용 (inline style + !important)
    let styleText = '';
    styleText += 'position:fixed!important;';
    styleText += 'z-index:99999!important;';
    styleText += 'background:#222!important;';
    styleText += 'color:#fff!important;';
    styleText += 'padding:12px 24px!important;';
    styleText += 'border-radius:8px!important;';
    styleText += 'box-shadow:0 2px 8px rgba(0,0,0,0.2)!important;';
    styleText += 'cursor:move!important;';
    styleText += 'font-size:18px!important;';
    styleText += 'min-width:120px!important;';
    styleText += 'max-width:320px!important;';
    styleText += 'border:1px solid #444!important;';
    styleText += 'user-select:none!important;';
    styleText += "font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif!important;";
    styleText += 'font-weight:600!important;';
    chrome.storage.local.get(['flowroutine-floating-timer-pos'], (result) => {
      if (result['flowroutine-floating-timer-pos']) {
        try {
          const pos = result['flowroutine-floating-timer-pos'];
          styleText += `left:${pos.left}!important;top:${pos.top}!important;`;
        } catch {}
      } else {
        styleText += `top:20px!important;left:${20 + idx * 180}px!important;`;
      }
      timerDiv.setAttribute('style', styleText);
      timerDiv.innerText = `${timer.label} (${timer.duration}분)`;
      document.body.appendChild(timerDiv);
      makeDraggable(timerDiv);
    });
  });
}

function makeDraggable(el) {
  let offsetX = 0;
  let offsetY = 0;

  el.addEventListener('mousedown', (e) => {
    const rect = el.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    el.style.left = rect.left + 'px';
    el.style.top = rect.top + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';

    function onMouseMove(e2) {
      el.style.left = e2.clientX - offsetX + 'px';
      el.style.top = e2.clientY - offsetY + 'px';
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      snap(el);
      // 위치 저장
  chrome.storage.local.set({ 'flowroutine-floating-timer-pos': { left: el.style.left, top: el.style.top } });
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

function snap(el) {
  const snapDist = 10;
  const rect = el.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  if (rect.left < snapDist) el.style.left = '0px';
  if (rect.top < snapDist) el.style.top = '0px';
  if (window.innerWidth - rect.right < snapDist) el.style.left = `${window.innerWidth - width}px`;
  if (window.innerHeight - rect.bottom < snapDist) el.style.top = `${window.innerHeight - height}px`;

  document.querySelectorAll('.flowroutine-floating-timer').forEach((other) => {
    if (other === el) return;
    const oRect = other.getBoundingClientRect();
    if (Math.abs(rect.left - oRect.right) < snapDist) {
      el.style.left = `${oRect.right}px`;
    }
    if (Math.abs(rect.right - oRect.left) < snapDist) {
      el.style.left = `${oRect.left - width}px`;
    }
    if (Math.abs(rect.top - oRect.bottom) < snapDist) {
      el.style.top = `${oRect.bottom}px`;
    }
    if (Math.abs(rect.bottom - oRect.top) < snapDist) {
      el.style.top = `${oRect.top - height}px`;
    }
  });
}

chrome.runtime.sendMessage({ type: 'getTimers' }, (response) => {
  if (response && Array.isArray(response.timerData)) {
    createFloatingTimers(response.timerData);
  }
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'SHOW_TIMER' && message.timer) {
      console.log('[FlowRoutine] floatingTimer SHOW', message.timer);
      document.querySelectorAll('.flowroutine-floating-timer').forEach((el) => el.remove());
      // 위치 복원 (chrome.storage.local)
      chrome.storage.local.get(['flowroutine-floating-timer-pos'], (result) => {
        let timerDiv = document.createElement('div');
        timerDiv.className = 'flowroutine-floating-timer';
        // 강력한 스타일 적용 (inline style + !important)
        let styleText = '';
        styleText += 'position:fixed!important;';
        styleText += 'z-index:99999!important;';
        styleText += 'background:#fff!important;';
        styleText += 'color:#222!important;';
        styleText += 'padding:12px 24px!important;';
        styleText += 'border-radius:8px!important;';
        styleText += 'box-shadow:0 2px 8px rgba(0,0,0,0.2)!important;';
        styleText += 'border:1px solid #ccc!important;';
        styleText += 'cursor:move!important;';
        styleText += 'font-size:18px!important;';
        styleText += 'min-width:120px!important;';
        styleText += 'max-width:320px!important;';
    styleText += 'user-select:none!important;';
    styleText += "font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif!important;";
    styleText += 'font-weight:600!important;';
        if (result['flowroutine-floating-timer-pos']) {
          try {
            const pos = result['flowroutine-floating-timer-pos'];
            styleText += `left:${pos.left}!important;top:${pos.top}!important;`;
          } catch {}
        } else {
          styleText += 'bottom:20px!important;right:20px!important;';
        }
        timerDiv.setAttribute('style', styleText);
        timerDiv.innerText = `⏱ ${message.timer.label} (${message.timer.duration}분)`;
        document.body.appendChild(timerDiv);
        makeDraggable(timerDiv);
      });
    }
    if (message.action === 'HIDE_TIMER') {
      console.log('[FlowRoutine] floatingTimer HIDE');
      // 현재 floatingTimer 위치 저장 (chrome.storage.local)
      const el = document.querySelector('.flowroutine-floating-timer');
      if (el) {
        chrome.storage.local.set({ 'flowroutine-floating-timer-pos': { left: el.style.left, top: el.style.top } });
      }
      document.querySelectorAll('.flowroutine-floating-timer').forEach((el) => el.remove());
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
