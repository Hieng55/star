(() => {
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d', { alpha: true });
  const pauseButton = document.getElementById('pauseButton');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const weekdays = ['CHỦ NHẬT', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY'];
  const messages = [
    'Một đêm bình yên giữa những vì sao',
    'Chậm lại một chút, bầu trời vẫn đang sáng',
    'Gửi một điều ước vào khoảng trời đêm',
    'Mỗi ngày đều có một vì sao dẫn lối'
  ];

  const today = new Date();
  const weekdayElement = document.getElementById('weekday');
  if (weekdayElement) {
    weekdayElement.textContent = weekdays[today.getDay()];
    document.getElementById('day').textContent = String(today.getDate()).padStart(2, '0');
    document.getElementById('month').textContent = String(today.getMonth() + 1).padStart(2, '0');
    document.getElementById('year').textContent = today.getFullYear();
    document.getElementById('message').textContent = messages[today.getDate() % messages.length];
  }

  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars = [];
  let fallingStars = [];
  let rays = [];
  let meteors = [];
  let running = !reduceMotion.matches;
  let rafId = 0;
  let lastTime = performance.now();
  let meteorClock = 0;
  const frameInterval = 1000 / 30;

  const random = (min, max) => min + Math.random() * (max - min);

  function createStar(index, total) {
    const belongsToGalaxy = Math.random() < .96;
    let x = Math.random() * width;
    let y = Math.random() * height;
    let orbit = null;
    let isCore = false;
    let isArm = false;

    if (belongsToGalaxy) {
      const upper = Math.random() < .5;
      const cx = width * .5;
      const cy = height * (upper ? .2 : .8);
      const type = Math.random();
      let radius;
      let angle;
      let scaleX;
      let scaleY;

      if (type < .68) {
        isArm = true;
        radius = .045 + Math.pow(Math.random(), .78) * .955;
        const armCount = 4;
        const arm = Math.floor(Math.random() * armCount);
        const armNoise = (Math.random() + Math.random() + Math.random() + Math.random() - 2) * (.05 + radius * .23);
        const spurRoll = Math.random();
        const spur = spurRoll < .22 ? (spurRoll < .11 ? -1 : 1) * (.1 + radius * .2) : 0;
        const ripple = Math.sin(radius * 15 + arm * 1.35) * (.025 + radius * .045);
        const twist = 8.05 + random(-.16, .16);
        angle = arm * (Math.PI * 2 / armCount) + radius * twist + spur + ripple + armNoise;
        scaleX = width * .62;
        scaleY = height * .135;
      } else if (type < .88) {
        isCore = true;
        radius = Math.pow(Math.random(), 2.35);
        angle = Math.random() * Math.PI * 2;
        scaleX = width * .22;
        scaleY = height * .043;
      } else {
        radius = Math.pow(Math.random(), 1.25);
        angle = Math.random() * Math.PI * 2;
        scaleX = width * .66;
        scaleY = height * .18;
      }

      const thickness = isArm
        ? (Math.random() + Math.random() + Math.random() - 1.5) * height * (.0025 + radius * .007)
        : (Math.random() + Math.random() - 1) * height * (isCore ? .002 : .005);
      x = cx + Math.cos(angle) * radius * scaleX;
      y = cy + Math.sin(angle) * radius * scaleY + thickness;
      const baseAngular = upper ? .0042 : -.0038;
      orbit = {
        cx,
        cy,
        radius,
        angle,
        scaleX,
        scaleY,
        thickness,
        angular: baseAngular * (1.13 - radius * .27) * random(.96, 1.04)
      };
    }

    const depth = Math.pow(Math.random(), 1.8);
    let red;
    let green;
    let blue;
    if (isCore) {
      red = 255;
      green = Math.round(random(242, 252));
      blue = Math.round(random(220, 244));
    } else if (orbit) {
      const outer = orbit.radius;
      red = Math.round(226 - outer * 35 + random(-7, 9));
      green = Math.round(239 - outer * 18 + random(-5, 8));
      blue = 255;
      if (Math.random() < .045) {
        red = 255;
        green = Math.round(random(238, 249));
        blue = Math.round(random(211, 232));
      }
    } else {
      red = Math.round(random(220, 250));
      green = Math.round(random(230, 250));
      blue = 255;
    }
    return {
      x,
      y,
      orbit,
      r: random(.18, .9) + depth * 1.12 + (isCore ? .24 : 0),
      a: isCore ? random(.78, 1) : random(.58, 1),
      phase: Math.random() * Math.PI * 2,
      speed: random(.12, .38) + depth * .35,
      drift: random(.18, .7) * (index % 2 ? 1 : -1),
      bloom: Math.random() < (isCore ? .035 : .01),
      flare: Math.random() < .0025,
      red,
      green,
      blue
    };
  }

  function createFallingStar(initial = true) {
    const hero = Math.random() < .18;
    const angle = random(-.09, .09);
    const speed = random(38, 64) + (hero ? 18 : 0);
    return {
      x: random(width * .06, width * .94),
      y: initial ? random(height * .13, height * .82) : random(height * .13, height * .23),
      vx: Math.sin(angle) * speed,
      vy: Math.cos(angle) * speed,
      r: random(.58, 1.15) + (hero ? .35 : 0),
      a: Math.min(1, random(.5, .86) + (hero ? .08 : 0)),
      trail: random(80, 150) + (hero ? random(35, 60) : 0),
      glow: hero ? 12 : 7,
      flare: hero,
      phase: random(0, Math.PI * 2),
      twinkle: random(.0006, .0011)
    };
  }

  function createRay() {
    return {
      x: random(width * .04, width * .96),
      y1: random(height * .1, height * .29),
      y2: random(height * .7, height * .98),
      width: random(1.8, 6.2),
      blur: random(7, 20),
      alpha: random(.018, .075),
      phase: random(0, Math.PI * 2),
      speed: random(.00012, .0003),
      drift: random(1, 8),
      lean: random(-6, 6),
      core: Math.random() < .32
    };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(19000, Math.max(7000, Math.floor(width * height / 170)));
    stars = Array.from({ length: count }, (_, i) => createStar(i, count));
    const fallingCount = Math.max(10, Math.min(18, Math.round(width / 135)));
    fallingStars = Array.from({ length: fallingCount }, () => createFallingStar(true));
    const rayCount = Math.max(5, Math.min(7, Math.round(width / 300)));
    rays = Array.from({ length: rayCount }, createRay);
    draw(performance.now(), 0);
  }

  function drawRays(time) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const ray of rays) {
      const pulse = .58 + .42 * Math.sin(time * ray.speed + ray.phase);
      const alpha = ray.alpha * pulse;
      const x = ray.x + Math.sin(time * ray.speed * .7 + ray.phase) * ray.drift;
      const gradient = ctx.createLinearGradient(x, ray.y1, x + ray.lean, ray.y2);
      gradient.addColorStop(0, 'rgba(220,230,255,0)');
      gradient.addColorStop(.1, `rgba(230,237,255,${alpha * .45})`);
      gradient.addColorStop(.33, `rgba(255,255,255,${alpha})`);
      gradient.addColorStop(.62, `rgba(201,214,248,${alpha * .55})`);
      gradient.addColorStop(.88, `rgba(246,249,255,${alpha * .84})`);
      gradient.addColorStop(1, 'rgba(218,228,255,0)');

      ctx.filter = `blur(${ray.blur}px)`;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(x - ray.width * 2.8, ray.y1);
      ctx.lineTo(x + ray.width * 2.8, ray.y1);
      ctx.lineTo(x + ray.lean + ray.width, ray.y2);
      ctx.lineTo(x + ray.lean - ray.width, ray.y2);
      ctx.closePath();
      ctx.fill();

      if (ray.core) {
        ctx.filter = `blur(${Math.max(1, ray.blur * .22)}px)`;
        ctx.globalAlpha = .34;
        ctx.fillRect(x - ray.width * .18, ray.y1 + (ray.y2 - ray.y1) * .2, ray.width * .36, (ray.y2 - ray.y1) * .58);
        ctx.globalAlpha = 1;
      }
    }
    ctx.filter = 'none';
    ctx.restore();
  }

  function spawnMeteor(x = random(width * .08, width * .86), y = random(-20, height * .48), manual = false) {
    const angle = random(.95, 1.18);
    const speed = manual ? random(900, 1250) : random(180, 320);
    meteors.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: manual ? random(.52, 1.05) : random(1.5, 2.4),
      length: manual ? random(45, 130) : random(70, 140),
      a: random(.55, .95)
    });
  }

  function drawStar(s, time, dt) {
    if (dt) {
      if (s.orbit) {
        s.orbit.angle += s.orbit.angular * dt;
        s.x = s.orbit.cx + Math.cos(s.orbit.angle) * s.orbit.radius * s.orbit.scaleX;
        s.y = s.orbit.cy + Math.sin(s.orbit.angle) * s.orbit.radius * s.orbit.scaleY + s.orbit.thickness;
      } else {
        s.x += s.drift * dt * 9;
        if (s.x > width + 5) s.x = -5;
        if (s.x < -5) s.x = width + 5;
      }
    }
    const twinkle = .58 + .42 * Math.sin(time * .001 * s.speed + s.phase);
    const alpha = Math.max(.06, s.a * twinkle);
    if (s.bloom) {
      ctx.fillStyle = `rgba(185,205,255,${alpha * .12})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 3.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(225,234,255,${alpha * .2})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 2.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(${s.red},${s.green},${s.blue},${alpha})`;
    if (s.r < 1.08 && !s.flare) {
      const size = Math.max(.7, s.r * 1.55);
      ctx.fillRect(s.x - size * .5, s.y - size * .5, size, size);
    } else {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (s.flare && alpha > .32) {
      const spike = 7 + s.r * 8;
      ctx.strokeStyle = `rgba(255,255,255,${alpha * .58})`;
      ctx.lineWidth = .65;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - spike);
      ctx.lineTo(s.x, s.y + spike);
      ctx.stroke();
      ctx.globalAlpha = .55;
      ctx.beginPath();
      ctx.moveTo(s.x - spike * .55, s.y);
      ctx.lineTo(s.x + spike * .55, s.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawFallingStar(s, time, dt) {
    if (dt) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.y > height * .9 || s.x < -40 || s.x > width + 40) {
        Object.assign(s, createFallingStar(false));
      }
    }

    const fadeIn = Math.min(1, Math.max(0, (s.y - height * .1) / (height * .1)));
    const fadeOut = Math.min(1, Math.max(0, (height * .9 - s.y) / (height * .09)));
    const pulse = .68 + .32 * Math.sin(time * s.twinkle + s.phase);
    const alpha = s.a * pulse * fadeIn * fadeOut;
    if (alpha <= .015) return;

    const magnitude = Math.hypot(s.vx, s.vy);
    const tailX = s.x - (s.vx / magnitude) * s.trail;
    const tailY = s.y - (s.vy / magnitude) * s.trail;
    const tail = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
    tail.addColorStop(0, 'rgba(158,185,240,0)');
    tail.addColorStop(.55, `rgba(184,207,255,${alpha * .05})`);
    tail.addColorStop(.88, `rgba(221,234,255,${alpha * .35})`);
    tail.addColorStop(1, `rgba(255,255,255,${alpha})`);

    ctx.strokeStyle = tail;
    ctx.shadowColor = `rgba(180,207,255,${alpha * .68})`;
    ctx.shadowBlur = s.glow;
    ctx.globalAlpha = .28;
    ctx.lineWidth = Math.max(1.25, s.r * 2.6);
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(.65, s.r * .65);
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();

    const headRadius = s.r * (s.flare ? 7 : 5.2);
    const headGlow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, headRadius);
    headGlow.addColorStop(0, `rgba(255,255,255,${alpha})`);
    headGlow.addColorStop(.24, `rgba(222,236,255,${alpha * .5})`);
    headGlow.addColorStop(1, 'rgba(164,193,248,0)');
    ctx.fillStyle = headGlow;
    ctx.beginPath();
    ctx.arc(s.x, s.y, headRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(246,249,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();

    if (s.flare && alpha > .34) {
      const spike = 6 + s.r * 7;
      ctx.strokeStyle = `rgba(247,251,255,${alpha * .58})`;
      ctx.lineWidth = .55;
      ctx.beginPath();
      ctx.moveTo(s.x - spike * .55, s.y);
      ctx.lineTo(s.x + spike * .55, s.y);
      ctx.moveTo(s.x, s.y - spike);
      ctx.lineTo(s.x, s.y + spike);
      ctx.stroke();
    }
  }

  function drawMeteor(m, dt) {
    m.life += dt;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    const p = m.life / m.maxLife;
    const alpha = Math.sin(Math.min(1, p) * Math.PI) * m.a;
    const mag = Math.hypot(m.vx, m.vy);
    const tx = m.x - (m.vx / mag) * m.length;
    const ty = m.y - (m.vy / mag) * m.length;
    const gradient = ctx.createLinearGradient(tx, ty, m.x, m.y);
    gradient.addColorStop(0, 'rgba(160,175,235,0)');
    gradient.addColorStop(.86, `rgba(215,223,255,${alpha * .35})`);
    gradient.addColorStop(1, `rgba(255,255,255,${alpha})`);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(m.x, m.y);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
    return m.life < m.maxLife && m.x < width + 160 && m.y < height + 160;
  }

  function draw(time, dt) {
    ctx.clearRect(0, 0, width, height);
    drawRays(time);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const star of stars) drawStar(star, time, dt);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';
    for (const star of fallingStars) drawFallingStar(star, time, dt);
    ctx.restore();
    meteors = meteors.filter(m => drawMeteor(m, dt));
  }

  function frame(time) {
    const elapsed = time - lastTime;
    if (elapsed < frameInterval) {
      if (running) rafId = requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min(.05, elapsed / 1000);
    lastTime = time - (elapsed % frameInterval);
    meteorClock += dt;
    if (meteorClock > random(5, 8)) {
      spawnMeteor();
      meteorClock = 0;
    }
    draw(time, dt);
    if (running) rafId = requestAnimationFrame(frame);
  }

  function setRunning(next) {
    running = next;
    document.body.classList.toggle('paused', !running);
    pauseButton.setAttribute('aria-pressed', String(!running));
    pauseButton.setAttribute('aria-label', running ? 'Tạm dừng chuyển động' : 'Tiếp tục chuyển động');
    if (running) {
      lastTime = performance.now();
      rafId = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(rafId);
    }
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return;
    spawnMeteor(event.clientX - random(40, 120), event.clientY - random(80, 220), true);
    if (!running) draw(performance.now(), 0.016);
  });
  window.addEventListener('keydown', event => {
    if (event.code === 'Space') {
      event.preventDefault();
      setRunning(!running);
    }
  });
  pauseButton.addEventListener('click', () => setRunning(!running));
  reduceMotion.addEventListener('change', event => setRunning(!event.matches));

  resize();
  if (running) rafId = requestAnimationFrame(frame);
})();
