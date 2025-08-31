interface Timer {
  id: number;
  label: string;
  type: string;
  duration: number; // minutes
  running: boolean;
  color: string;
  endTime?: number;
}

declare const chrome: any;

interface Display {
  el: HTMLDivElement;
  interval: number;
  progress: SVGCircleElement;
  timeEl: SVGTextElement;
}

const displays: Record<number, Display> = {};

function playBell(volume = 1) {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const gain = ctx.createGain();
  gain.gain.value = volume;
  gain.connect(ctx.destination);
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = 880;
  osc1.connect(gain);
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = 1320;
  osc2.connect(gain);
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1);
  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 1);
  osc2.stop(now + 1);
}

// prevent multiple injections
if (!(window as any).flowRoutineInitialized) {
  (window as any).flowRoutineInitialized = true;

  chrome.runtime.onMessage.addListener((message: any) => {
    if (message.type === 'timers') {
      render(message.timers as Timer[]);
    } else if (message.type === 'playSound') {
      playBell(message.volume ?? 1);
    }
  });

  chrome.runtime.sendMessage({ type: 'getSettings' }, (s: any) => {
    const show = s?.showFloating !== false;
    chrome.runtime.sendMessage({ type: 'getTimers' }, (res: any) => {
      const list = Array.isArray(res?.timerData) ? res.timerData : [];
      render(show ? list.filter((t: Timer) => t.running) : []);
    });
  });
}

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
    if (display) {
      if (typeof timer.x === 'number' && typeof timer.y === 'number') {
        display.el.style.left = `${timer.x}px`;
        display.el.style.top = `${timer.y}px`;
        display.el.style.right = 'auto';
      }
    } else {
      const el = document.createElement('div');
      el.className = 'flowroutine-floating-timer';
      el.style.setProperty('all', 'initial');
      el.style.position = 'fixed';
      if (typeof timer.x === 'number' && typeof timer.y === 'number') {
        el.style.left = `${timer.x}px`;
        el.style.top = `${timer.y}px`;
        el.style.right = 'auto';
      } else {
        el.style.top = '10px';
        el.style.right = `${10 + index * 110}px`;
      }
      el.style.width = '100px';
      el.style.height = '100px';
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.background = timer.color;
      el.style.color = '#fff';
      el.style.borderRadius = '8px';
      el.style.fontFamily = 'sans-serif';
      el.style.zIndex = '2147483647';
      el.style.userSelect = 'none';
      el.style.cursor = 'grab';
      el.dataset.id = String(timer.id);
      el.title = timer.label;
      document.body.appendChild(el);

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '60');
      svg.setAttribute('height', '60');
      const radius = 28;
      const circumference = 2 * Math.PI * radius;

      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bg.setAttribute('cx', '30');
      bg.setAttribute('cy', '30');
      bg.setAttribute('r', String(radius));
      bg.setAttribute('stroke', '#555');
      bg.setAttribute('stroke-width', '4');
      bg.setAttribute('fill', 'none');

      const fg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      fg.setAttribute('cx', '30');
      fg.setAttribute('cy', '30');
      fg.setAttribute('r', String(radius));
      fg.setAttribute('stroke', '#fff');
      fg.setAttribute('stroke-width', '4');
      fg.setAttribute('fill', 'none');
      fg.setAttribute('stroke-dasharray', String(circumference));
      fg.setAttribute('stroke-dashoffset', String(circumference));
      fg.style.transform = 'rotate(-90deg)';
      fg.style.transformOrigin = '50% 50%';

      const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textEl.setAttribute('x', '30');
      textEl.setAttribute('y', '35');
      textEl.setAttribute('text-anchor', 'middle');
      textEl.setAttribute('fill', '#fff');
      textEl.setAttribute('font-size', '12');
      svg.appendChild(bg);
      svg.appendChild(fg);
      svg.appendChild(textEl);
      el.appendChild(svg);

      let offsetX = 0;
      let offsetY = 0;
      let dragging = false;
      let snapTargetEl: HTMLElement | null = null;

      el.addEventListener('mousedown', (e) => {
        dragging = true;
        offsetX = e.clientX - el.offsetLeft;
        offsetY = e.clientY - el.offsetTop;
        el.style.cursor = 'grabbing';
        e.preventDefault();
        e.stopPropagation();
        document.body.style.userSelect = 'none';
      });

      document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        e.preventDefault();
        e.stopPropagation();
        el.style.top = `${e.clientY - offsetY}px`;
        el.style.left = `${e.clientX - offsetX}px`;
        el.style.right = 'auto';
        const snapPos = computeSnap(el);
        if (snapPos) {
          el.style.outline = '2px solid #fff';
          if (snapTargetEl && snapTargetEl !== snapPos.target) {
            snapTargetEl.style.outline = '';
          }
          if (snapPos.target && snapPos.target !== el) {
            snapTargetEl = snapPos.target as HTMLElement;
            snapTargetEl.style.outline = '2px dashed #fff';
          } else {
            snapTargetEl = null;
          }
        } else {
          el.style.outline = '';
          if (snapTargetEl) {
            snapTargetEl.style.outline = '';
            snapTargetEl = null;
          }
        }
      }, true);

      document.addEventListener('mouseup', (e) => {
        if (!dragging) return;
        e.preventDefault();
        e.stopPropagation();
        dragging = false;
        el.style.cursor = 'grab';
        snap(el);
        el.style.outline = '';
        if (snapTargetEl) {
          snapTargetEl.style.outline = '';
          snapTargetEl = null;
        }
        document.body.style.userSelect = '';
        const x = parseInt(el.style.left || '0', 10);
        const y = parseInt(el.style.top || '0', 10);
        chrome.runtime.sendMessage({
          type: 'moveTimer',
          id: timer.id,
          x,
          y,
        });
      }, true);

      el.addEventListener(
        'touchstart',
        (e) => {
          dragging = true;
          const touch = e.touches[0];
          offsetX = touch.clientX - el.offsetLeft;
          offsetY = touch.clientY - el.offsetTop;
          e.preventDefault();
          e.stopPropagation();
          document.body.style.userSelect = 'none';
        },
        { passive: false }
      );

      el.addEventListener(
        'touchmove',
        (e) => {
          if (!dragging) return;
          e.preventDefault();
          e.stopPropagation();
          const touch = e.touches[0];
          el.style.top = `${touch.clientY - offsetY}px`;
          el.style.left = `${touch.clientX - offsetX}px`;
          el.style.right = 'auto';
          const snapPos = computeSnap(el);
          if (snapPos) {
            el.style.outline = '2px solid #fff';
            if (snapTargetEl && snapTargetEl !== snapPos.target) {
              snapTargetEl.style.outline = '';
            }
            if (snapPos.target && snapPos.target !== el) {
              snapTargetEl = snapPos.target as HTMLElement;
              snapTargetEl.style.outline = '2px dashed #fff';
            } else {
              snapTargetEl = null;
            }
          } else {
            el.style.outline = '';
            if (snapTargetEl) {
              snapTargetEl.style.outline = '';
              snapTargetEl = null;
            }
          }
        },
        { passive: false }
      );

      el.addEventListener('touchend', () => {
        if (!dragging) return;
        dragging = false;
        snap(el);
        el.style.outline = '';
        if (snapTargetEl) {
          snapTargetEl.style.outline = '';
          snapTargetEl = null;
        }
        document.body.style.userSelect = '';
        const x = parseInt(el.style.left || '0', 10);
        const y = parseInt(el.style.top || '0', 10);
        chrome.runtime.sendMessage({ type: 'moveTimer', id: timer.id, x, y });
      });

      display = displays[timer.id] = { el, interval: 0, progress: fg, timeEl: textEl };
    }

    const update = () => {
      const total = timer.duration * 60 * 1000;
      const remaining = Math.max(0, (timer.endTime || 0) - Date.now());
      const ratio = remaining / total;
      const circ = Number(display!.progress.getAttribute('stroke-dasharray'));
      display!.progress.setAttribute('stroke-dashoffset', String(circ * (1 - ratio)));
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000)
        .toString()
        .padStart(2, '0');
      display!.timeEl.textContent = `${m}:${s}`;
      if (remaining <= 0) {
        clearInterval(display!.interval);
        chrome.runtime.sendMessage({
          type: 'timerEnded',
          id: timer.id,
          label: timer.label,
        });
      }
    };

    clearInterval(display.interval);
    update();
    display.interval = window.setInterval(update, 1000);
  });
}

function computeSnap(el: HTMLDivElement) {
  const buffer = 10;
  const rect = el.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const candidates: {
    dist: number;
    x: number;
    y: number;
    target?: HTMLElement;
  }[] = [];

  if (rect.left <= buffer)
    candidates.push({ dist: rect.left, x: 0, y: rect.top });
  if (window.innerWidth - rect.right <= buffer)
    candidates.push({
      dist: window.innerWidth - rect.right,
      x: window.innerWidth - width,
      y: rect.top,
    });
  if (rect.top <= buffer)
    candidates.push({ dist: rect.top, x: rect.left, y: 0 });
  if (window.innerHeight - rect.bottom <= buffer)
    candidates.push({
      dist: window.innerHeight - rect.bottom,
      x: rect.left,
      y: window.innerHeight - height,
    });

  document.querySelectorAll('.flowroutine-floating-timer').forEach((other) => {
    if (other === el) return;
    const o = (other as HTMLDivElement).getBoundingClientRect();
    const dLeft = Math.abs(rect.left - o.right);
    if (dLeft <= buffer)
      candidates.push({ dist: dLeft, x: o.right, y: o.top, target: other as HTMLElement });
    const dRight = Math.abs(rect.right - o.left);
    if (dRight <= buffer)
      candidates.push({ dist: dRight, x: o.left - width, y: o.top, target: other as HTMLElement });
    const dTop = Math.abs(rect.top - o.bottom);
    if (dTop <= buffer)
      candidates.push({ dist: dTop, x: o.left, y: o.bottom, target: other as HTMLElement });
    const dBottom = Math.abs(rect.bottom - o.top);
    if (dBottom <= buffer)
      candidates.push({ dist: dBottom, x: o.left, y: o.top - height, target: other as HTMLElement });
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.dist - b.dist);
  return candidates[0];
}

function snap(el: HTMLDivElement) {
  const pos = computeSnap(el);
  if (pos) {
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    el.style.right = 'auto';
  }
  return pos;
}
