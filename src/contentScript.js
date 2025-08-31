// Float timer renderer injected into pages
if (!window.flowRoutineInitialized) {
  window.flowRoutineInitialized = true;

  const displays = {};

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'timers') {
      render(message.timers);
    }
  });

  function render(timers) {
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
        el.style.width = '100px';
        el.style.height = '100px';
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.background = 'rgba(0, 0, 0, 0.7)';
        el.style.color = '#fff';
        el.style.borderRadius = '8px';
        el.style.zIndex = '2147483647';
        el.dataset.id = String(timer.id);
        document.body.appendChild(el);

        const labelEl = document.createElement('div');
        labelEl.textContent = timer.label;
        labelEl.style.marginBottom = '4px';
        el.appendChild(labelEl);

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
          if (!dragging) return;
          dragging = false;
          el.style.cursor = 'grab';
          snap(el);
        });

        el.addEventListener(
          'touchmove',
          (e) => {
            if (!dragging) return;
            const touch = e.touches[0];
            el.style.top = `${touch.clientY - offsetY}px`;
            el.style.left = `${touch.clientX - offsetX}px`;
            el.style.right = 'auto';
          },
          { passive: true }
        );

        el.addEventListener('touchend', () => {
          if (!dragging) return;
          dragging = false;
          snap(el);
        });

        display = displays[timer.id] = { el, interval: 0, progress: fg, timeEl: textEl };
      }

      const update = () => {
        const total = timer.duration * 60 * 1000;
        const remaining = Math.max(0, (timer.endTime || 0) - Date.now());
        const ratio = remaining / total;
        const circ = Number(display.progress.getAttribute('stroke-dasharray'));
        display.progress.setAttribute('stroke-dashoffset', String(circ * (1 - ratio)));
        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000)
          .toString()
          .padStart(2, '0');
        display.timeEl.textContent = `${m}:${s}`;
        if (remaining <= 0) {
          clearInterval(display.interval);
        }
      };

      clearInterval(display.interval);
      update();
      display.interval = window.setInterval(update, 1000);
    });
  }

  function snap(el) {
    const buffer = 10;
    const rect = el.getBoundingClientRect();
    if (rect.left <= buffer) {
      el.style.left = '0px';
      el.style.right = 'auto';
    }
    if (window.innerWidth - rect.right <= buffer) {
      el.style.left = 'auto';
      el.style.right = '0px';
    }
    if (rect.top <= buffer) {
      el.style.top = '0px';
    }
    if (window.innerHeight - rect.bottom <= buffer) {
      el.style.top = 'auto';
      el.style.bottom = '0px';
    }

    document.querySelectorAll('.flowroutine-floating-timer').forEach((other) => {
      if (other === el) return;
      const o = other.getBoundingClientRect();
      if (Math.abs(rect.left - o.right) <= buffer) {
        el.style.left = `${o.right}px`;
        el.style.right = 'auto';
      }
      if (Math.abs(rect.right - o.left) <= buffer) {
        el.style.left = `${o.left - rect.width}px`;
        el.style.right = 'auto';
      }
      if (Math.abs(rect.top - o.bottom) <= buffer) {
        el.style.top = `${o.bottom}px`;
      }
      if (Math.abs(rect.bottom - o.top) <= buffer) {
        el.style.top = `${o.top - rect.height}px`;
      }
    });
  }
}
