/* ============================================================
   QON — интерактив
   ============================================================ */

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 1. 3D-поле частиц (Canvas 2D) ---------- */
(function particleField() {
  const canvas = document.getElementById('particles');
  if (!canvas || prefersReduced) return;

  const ctx = canvas.getContext('2d');

  const FOV = 900;
  const CAM_Z = 1900;
  const SPREAD = 950;
  const LINK = 130;
  const COUNT = window.innerWidth < 768 ? 60 : 130;

  let w = 0, h = 0, dpr = 1;

  const pts = [];
  for (let i = 0; i < COUNT; i++) {
    pts.push({
      x: (Math.random() - 0.5) * SPREAD * 2,
      y: (Math.random() - 0.5) * SPREAD * 2,
      z: (Math.random() - 0.5) * SPREAD * 2,
      size: 0.6 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      speed: 0.15 + Math.random() * 0.35
    });
  }

  const projected = new Array(COUNT);
  let angleX = 0, angleY = 0, targetX = 0, targetY = 0, spin = 0, t = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('mousemove', (e) => {
    targetY = (e.clientX / window.innerWidth - 0.5) * 0.7;
    targetX = (e.clientY / window.innerHeight - 0.5) * 0.45;
  });

  function frame() {
    t += 0.016;
    spin += 0.0011;
    angleX += (targetX - angleX) * 0.04;
    angleY += (targetY - angleY) * 0.04;

    const ay = angleY + spin;
    const cy = Math.cos(ay), sy = Math.sin(ay);
    const cx = Math.cos(angleX), sx = Math.sin(angleX);

    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < COUNT; i++) {
      const p = pts[i];

      // лёгкое «дыхание» точки
      const bx = p.x + Math.sin(t * p.speed + p.phase) * 14;
      const by = p.y + Math.cos(t * p.speed * 0.9 + p.phase) * 14;

      // поворот вокруг Y
      const x1 = bx * cy - p.z * sy;
      const z1 = bx * sy + p.z * cy;

      // поворот вокруг X
      const y1 = by * cx - z1 * sx;
      const z2 = by * sx + z1 * cx;

      const zc = z2 + CAM_Z;
      if (zc < 80) { projected[i] = null; continue; }

      const scale = FOV / zc;
      const px = w / 2 + x1 * scale;
      const py = h / 2 + y1 * scale;

      projected[i] = { x: px, y: py, scale };

      const depth = Math.min(1, Math.max(0, (zc - (CAM_Z - SPREAD)) / (SPREAD * 2)));
      const alpha = 0.05 + (1 - depth) * 0.55;
      const r = Math.max(0.4, p.size * scale * 2.1);

      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 163, 255, ${alpha})`;
      ctx.fill();
    }

    // линии между близкими частицами
    ctx.lineWidth = 0.6;
    for (let i = 0; i < COUNT; i++) {
      const a = projected[i];
      if (!a) continue;

      for (let j = i + 1; j < COUNT; j++) {
        const b = projected[j];
        if (!b) continue;

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > LINK * LINK) continue;

        const d = Math.sqrt(d2);
        const alpha = (1 - d / LINK) * 0.17 * Math.min(a.scale, b.scale) * 1.6;

        ctx.strokeStyle = `rgba(0, 163, 255, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();

/* ---------- 2. Хедер при скролле ---------- */
const header = document.querySelector('.header');
if (header) {
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ---------- 3. Мобильное меню ---------- */
const burger = document.querySelector('.burger');
const nav = document.querySelector('.nav');

burger?.addEventListener('click', () => {
  const open = document.body.classList.toggle('nav-open');
  burger.setAttribute('aria-expanded', String(open));
});

nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    document.body.classList.remove('nav-open');
    burger?.setAttribute('aria-expanded', 'false');
  });
});

/* ---------- 4. Появление блоков при скролле ---------- */
const revealEls = document.querySelectorAll('[data-reveal]');

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  revealEls.forEach((el) => {
    if (el.dataset.delay) el.style.transitionDelay = `${el.dataset.delay}ms`;
    revealObserver.observe(el);
  });
} else {
  revealEls.forEach((el) => el.classList.add('is-visible'));
}

/* ---------- 5. Анимированные счётчики ---------- */
const counters = document.querySelectorAll('[data-count]');

if ('IntersectionObserver' in window) {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const duration = 1600;
      const start = performance.now();

      function tick(now) {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.6 });

  counters.forEach((el) => counterObserver.observe(el));
}

/* ---------- 6. Подсветка карточек за курсором ---------- */
document.querySelectorAll('.card').forEach((card) => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    card.style.setProperty('--my', `${e.clientY - rect.top}px`);
  });
});


/* ---------- 8. Форма отправки заявки ко мне на почту---------- 
const form = document.querySelector('.contact-form');

form?.addEventListener('submit', function(e) {
  e.preventDefault();

  const button = form.querySelector('button[type="submit"]');
  if (!button || button.disabled) return;

  const name = form.querySelector('#name');
  const contact = form.querySelector('#contact');

  if (!name?.value.trim() || !contact?.value.trim()) {
    [name, contact].forEach((field) => {
      if (field && !field.value.trim()) {
        field.style.borderColor = 'rgba(255, 77, 157, 0.7)';
        field.addEventListener('input', () => { field.style.borderColor = ''; }, { once: true });
      }
    });
    return;
  }

 // Блокируем кнопку, показываем процесс
  const originalText = button.textContent;
  button.textContent = 'Отправка...';
  button.disabled = true;

  // Отправляем через EmailJS
  emailjs.sendForm('service_in1negj', 'temlate_bfld7ly', form, 'sVQ2jPfDY98XRIsyB')
    .then(function() {
      // Успех
      button.textContent = 'Заявка отправлена ✓';
      form.classList.add('is-sent');
      form.reset(); // Очищаем поля
    }, function(error) {
      // Ошибка
      console.error('Ошибка отправки:', error);
      button.textContent = 'Ошибка. Попробуйте ещё раз';
      button.disabled = false;
      setTimeout(() => { button.textContent = originalText; }, 3000);
    });
});*/


/* ---------- 9.Умное удаление белого фона со сглаживанием ---------- */
function removeWhiteBackground(imgElement) {
  const img = new Image();
  // Убрали crossOrigin, так как картинки лежат на том же домене
  img.src = imgElement.src;
  img.onload = function() {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const whiteness = Math.min(data[i], data[i+1], data[i+2]);
        if (whiteness > 180) {
          let alpha = (255 - whiteness) / 75; 
          alpha = Math.max(0, Math.min(1, alpha));
          data[i+3] = Math.round(alpha * data[i+3]);
        }
      }
      ctx.putImageData(imageData, 0, 0);
      imgElement.src = canvas.toDataURL('image/png');
    } catch (e) {
      console.warn('Не удалось обработать логотип (CORS):', e);
    }
  }
}

// Запускаем магию для всех логотипов
document.querySelectorAll('.logo-img, .hero-logo').forEach(removeWhiteBackground);

/* ---------- 10. Исправленный Кастомный Курсор ---------- */
(function customCursor() {
  // Проверяем только ширину экрана, чтобы курсор точно работал на ПК/ноутбуках
  if (window.innerWidth <= 1024) return; 

  const dot = document.createElement('div');
  const ring = document.createElement('div');
  dot.className = 'cursor-dot';
  ring.className = 'cursor-ring';
  
  // Добавляем элементы в DOM и скрываем стандартный курсор
  document.body.append(dot, ring);
  document.body.classList.add('has-custom-cursor');

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let rx = mx;
  let ry = my;

  window.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    // Используем translate3d для плавности
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
  });

  // Плавное движение кольца
  function loop() {
    rx += (mx - rx) * 0.15;
    ry += (my - ry) * 0.15;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  }
  loop();

  // Добавляем реакцию на наведение
  const interactives = document.querySelectorAll('a, button, .card, .case, input, textarea');
  interactives.forEach((el) => {
    el.addEventListener('mouseenter', () => {
      ring.style.width = '54px';
      ring.style.height = '54px';
      ring.style.borderColor = 'rgba(0, 163, 255, 0.9)';
      ring.style.backgroundColor = 'rgba(0, 163, 255, 0.1)';
    });
    el.addEventListener('mouseleave', () => {
      ring.style.width = '34px';
      ring.style.height = '34px';
      ring.style.borderColor = 'rgba(0, 163, 255, 0.6)';
      ring.style.backgroundColor = 'transparent';
    });
  });
})();