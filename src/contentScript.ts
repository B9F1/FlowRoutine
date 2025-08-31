interface Timer {
  id: number;
  label: string;
  type: string;
  duration: number;
  running: boolean;
  endTime?: number;
}

declare const chrome: any;

interface Display {
  el: HTMLDivElement;
  interval: number;
}

const displays: Record<number, Display> = {};

chrome.runtime.onMessage.addListener((message: any) => {
  if (message.type === 'timers') {
    render(message.timers as Timer[]);
  }
});

function render(timers: Timer[]) {
  // remove old timers
  Object.keys(displays).forEach((id) => {
    if (!timers.find((t) => t.id === Number(id))) {
      const d = displays[Number(id)];
      clearInterval(d.interval);
      d.el.remove();
      delete displays[Number(id)];
    }
  });

  timers.forEach((timer, index) => {
    let display = displays[timer.id];
    if (!display) {
      const el = document.createElement('div');
      el.className = 'flowroutine-floating-timer';
      el.style.position = 'fixed';
      el.style.top = '10px';
      el.style.right = `${10 + index * 110}px`;
      el.style.padding = '8px 12px';
      el.style.background = 'rgba(0, 0, 0, 0.7)';
      el.style.color = '#fff';
      el.style.borderRadius = '4px';
      el.style.zIndex = '2147483647';
      document.body.appendChild(el);

      let offsetX = 0;
      let offsetY = 0;
      let dragging = false;

      el.addEventListener('mousedown', (e) => {
        dragging = true;
        offsetX = e.clientX - el.offsetLeft;
        offsetY = e.clientY - el.offsetTop;
        el.style.cursor = 'grabbing';
      });

      document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        el.style.top = `${e.clientY - offsetY}px`;
        el.style.left = `${e.clientX - offsetX}px`;
        el.style.right = 'auto';
      });

      document.addEventListener('mouseup', () => {
        dragging = false;
        el.style.cursor = 'grab';
      });

      // touch 이벤트 passive 옵션 추가
      el.addEventListener('touchmove', (e) => {
        if (!dragging) return;
        const touch = e.touches[0];
        el.style.top = `${touch.clientY - offsetY}px`;
        el.style.left = `${touch.clientX - offsetX}px`;
        el.style.right = 'auto';
      }, { passive: true });

      display = displays[timer.id] = { el, interval: 0 };
    }

    const update = () => {
      const remaining = Math.max(0, (timer.endTime || 0) - Date.now());
      if (remaining <= 0) {
        display!.el.textContent = `${timer.label} 완료`;
        clearInterval(display!.interval);
      } else {
        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000)
          .toString()
          .padStart(2, '0');
        display!.el.textContent = `${timer.label} ${m}:${s}`;
      }
    };

    clearInterval(display.interval);
    update();
    display.interval = window.setInterval(update, 1000);
  });
}
