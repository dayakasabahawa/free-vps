/* ============================================================
   NEXUS VPS — all interactivity, vanilla JavaScript only
   ============================================================ */
(() => {
  'use strict';

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------------- toast ---------------- */
  const toastEl = $('#toast');
  let toastTimer;
  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  /* ---------------- theme ---------------- */
  const root = document.documentElement;
  const savedTheme = localStorage.getItem('nexus-theme');
  if (savedTheme) root.dataset.theme = savedTheme;
  $('#themeToggle').addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    localStorage.setItem('nexus-theme', next);
    toast(next === 'light' ? 'Light mode on' : 'Dark mode on');
  });

  /* ---------------- header / progress / to-top ---------------- */
  const header = $('#header');
  const progress = $('#scrollProgress');
  const toTop = $('#toTop');
  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('scrolled', y > 24);
    toTop.classList.toggle('show', y > 600);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  /* ---------------- mobile menu ---------------- */
  const menuBtn = $('#menuBtn');
  menuBtn.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  $$('#nav a').forEach((a) => a.addEventListener('click', () => {
    document.body.classList.remove('menu-open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }));

  /* ---------------- reveal on scroll ---------------- */
  const reveals = $$('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in'));
  } else {
    const revObs = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
    reveals.forEach((el) => revObs.observe(el));
  }

  /* ---------------- stat counters ---------------- */
  const counters = $$('[data-count]');
  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const suffix = el.dataset.suffix || '';
    if (reduceMotion) { el.textContent = target.toFixed(decimals) + suffix; return; }
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const value = (target * eased).toFixed(decimals);
      el.textContent = Number(value).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if ('IntersectionObserver' in window) {
    const countObs = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => { if (e.isIntersecting) { animateCount(e.target); obs.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach((el) => countObs.observe(el));
  } else counters.forEach(animateCount);

  /* ---------------- terminal typing ---------------- */
  const terminalBody = $('#terminalBody');
  const termLines = [
    [['$ ', 'c-gr'], ['nexus init --region sg-01 --tier free']],
    [['  ↳ ', 'c-dim'], ['resolving nearest edge node', '']],
    [['  ✓ ', 'c-gr'], ['connected to sg1.nexus-vps.net:443', '']],
    [['  ✓ ', 'c-gr'], ['TLS 1.3 handshake complete  ', ''], ['(12ms)', 'c-cy']],
    [['$ ', 'c-gr'], ['node status --all']],
    [['  ● ', 'c-cy'], ['38 nodes online  ', ''], ['0 offline', 'c-gr']],
    [['  ● ', 'c-pu'], ['transport: ws  security: tls  encryption: none']],
    [['  ● ', 'c-am'], ['auto-scaler armed · watching traffic…']],
    [['$ ', 'c-gr'], ['generate vless --uuid auto']],
    [['  ✓ ', 'c-gr'], ['profile ready  ', ''], ['→ open VLESS Studio ↓', 'c-cy']]
  ];

  async function runTerminal() {
    if (reduceMotion) {
      termLines.forEach((line) => {
        const div = document.createElement('div');
        div.className = 'term-line';
        line.forEach(([t, c]) => { const s = document.createElement('span'); s.className = c; s.textContent = t; div.appendChild(s); });
        terminalBody.appendChild(div);
      });
      return;
    }
    while (true) {
      terminalBody.innerHTML = '';
      for (const line of termLines) {
        const div = document.createElement('div');
        div.className = 'term-line';
        terminalBody.appendChild(div);
        for (const [text, cls] of line) {
          const span = document.createElement('span');
          span.className = cls;
          div.appendChild(span);
          for (const ch of text) { span.textContent += ch; await wait(9); }
        }
        await wait(130);
      }
      const cursor = document.createElement('div');
      cursor.className = 'term-line c-cy';
      cursor.innerHTML = '$ <span style="animation:blink 1s steps(2) infinite">█</span>';
      terminalBody.appendChild(cursor);
      await wait(4200);
    }
  }
  const blinkStyle = document.createElement('style');
  blinkStyle.textContent = '@keyframes blink{50%{opacity:0}}';
  document.head.appendChild(blinkStyle);
  runTerminal();

  /* ---------------- traffic chart ---------------- */
  const chartBars = $('#chartBars');
  const chartValue = $('#chartValue');
  const bars = [];
  for (let i = 0; i < 38; i++) {
    const bar = document.createElement('i');
    bar.style.height = 18 + Math.random() * 70 + '%';
    chartBars.appendChild(bar);
    bars.push(bar);
  }
  if (!reduceMotion) {
    setInterval(() => {
      bars.forEach((b, i) => {
        const wave = Math.sin(Date.now() / 700 + i / 3) * 18;
        b.style.height = Math.max(12, Math.min(95, 26 + Math.random() * 45 + wave)) + '%';
      });
      chartValue.textContent = (0.85 + Math.random() * 0.9).toFixed(2) + ' GB/s';
    }, 900);
  }

  /* ---------------- billing toggle ---------------- */
  $$('.billing-toggle button').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.billing-toggle button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const yearly = btn.dataset.billing === 'yearly';
      $$('.plan-price .amount').forEach((el) => {
        const raw = yearly ? el.dataset.yearly : el.dataset.monthly;
        el.textContent = Number(raw).toLocaleString('en-US');
      });
    });
  });

  /* ---------------- VLESS studio ---------------- */
  const cfg = {
    server: $('#cfgServer'), port: $('#cfgPort'), uuid: $('#cfgUuid'),
    transport: $('#cfgTransport'), security: $('#cfgSecurity'),
    path: $('#cfgPath'), sni: $('#cfgSni'), name: $('#cfgName')
  };
  const uriBox = $('#uriBox');
  const outputStatus = $('#outputStatus');
  const copyBtn = $('#copyUri');
  const downloadBtn = $('#downloadUri');
  let currentUri = '';

  function createUuid() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  cfg.uuid.value = createUuid();

  $('#randomUuid').addEventListener('click', () => {
    cfg.uuid.value = createUuid();
    toast('New UUID generated');
  });

  $('#configForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const server = cfg.server.value.trim();
    const port = cfg.port.value.trim();
    const uuid = cfg.uuid.value.trim();
    const sni = cfg.sni.value.trim() || server;
    if (!server || !port || !uuid) {
      toast('Server, port and UUID are required');
      (!server ? cfg.server : !port ? cfg.port : cfg.uuid).focus();
      return;
    }

    const params = new URLSearchParams();
    params.set('encryption', 'none');
    params.set('security', cfg.security.value);
    params.set('type', cfg.transport.value);
    params.set('sni', sni);
    if (cfg.transport.value !== 'raw') params.set('host', sni);
    const pathVal = cfg.path.value.trim();
    if (cfg.transport.value === 'grpc') {
      if (pathVal) params.set('serviceName', pathVal.replace(/^\//, ''));
    } else if (pathVal) {
      params.set('path', pathVal.startsWith('/') ? pathVal : '/' + pathVal);
    }
    if (cfg.security.value === 'reality') params.set('fp', 'chrome');

    const name = cfg.name.value.trim() || 'NEXUS Node';
    currentUri = `vless://${uuid}@${server}:${port}?${params.toString()}#${encodeURIComponent(name)}`;

    uriBox.textContent = currentUri;
    outputStatus.textContent = 'URI ready · local only';
    outputStatus.classList.add('ready');
    copyBtn.disabled = false;
    downloadBtn.disabled = false;
    toast('VLESS URI generated');
    $('.studio-output').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  });

  $('#resetCfg').addEventListener('click', () => {
    cfg.server.value = 'sg1.nexus-vps.net';
    cfg.port.value = '443';
    cfg.uuid.value = createUuid();
    cfg.transport.value = 'ws';
    cfg.security.value = 'tls';
    cfg.path.value = '/vless';
    cfg.sni.value = 'sg1.nexus-vps.net';
    cfg.name.value = 'NEXUS · Singapore 01';
    currentUri = '';
    uriBox.innerHTML = '<span class="uri-placeholder">Your vless:// link will appear here…</span>';
    outputStatus.textContent = 'waiting for input';
    outputStatus.classList.remove('ready');
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
    toast('Form reset');
  });

  copyBtn.addEventListener('click', async () => {
    if (!currentUri) return;
    try {
      await navigator.clipboard.writeText(currentUri);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = currentUri;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast('Link copied to clipboard');
  });

  downloadBtn.addEventListener('click', () => {
    if (!currentUri) return;
    const text = [
      '# NEXUS VPS — VLESS profile',
      '# Generated locally in your browser',
      '',
      currentUri,
      '',
      'Client: ' + $('.client-tabs button.active').textContent,
      'Security: ' + cfg.security.value.toUpperCase(),
      'Transport: ' + cfg.transport.value.toUpperCase(),
      'SNI / Host: ' + cfg.sni.value
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nexus-vless-config.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Config downloaded');
  });

  /* ---------------- client guides ---------------- */
  const guides = {
    v2rayNG: [
      'Install v2rayNG from the Google Play Store or its GitHub releases page.',
      'Open the app, tap the + button and choose "Import config from clipboard".',
      'Paste the generated vless:// link — the profile is filled in automatically.',
      'Select the profile, tap the round connect button and check the speed indicator.'
    ],
    v2rayN: [
      'Download v2rayN from its GitHub releases and extract the archive.',
      'Right-click the v2rayN tray icon → "Import" → "Import share link from clipboard".',
      'Confirm the added server, then pick it in the server list.',
      'Press "Activate" (or Ctrl+A) to connect. Check the taskbar icon for status.'
    ],
    NekoRay: [
      'Install NekoRay (Windows, macOS or Linux) from the official releases page.',
      'Go to Server → "Import from clipboard" and paste your VLESS URI.',
      'Double-click the new profile to select it and adjust routing if needed.',
      'Click the power button in the main window to start the connection.'
    ],
    Shadowrocket: [
      'Install Shadowrocket from the App Store (paid app, region availability may vary).',
      'Copy the generated link, then open Shadowrocket — it offers to add it automatically.',
      'Verify the transport, SNI and path fields in the profile details.',
      'Flip the switch at the top to connect, then check the traffic counters.'
    ]
  };
  const stepsEl = $('#clientSteps');
  function renderGuide(client) {
    stepsEl.innerHTML = guides[client].map((s) => `<li>${s}</li>`).join('');
  }
  renderGuide('v2rayNG');
  $$('.client-tabs button').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.client-tabs button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderGuide(btn.dataset.client);
    });
  });

  /* ---------------- simulated network telemetry ---------------- */
  const nodes = [
    { flag: '🇸🇬', city: 'Singapore', code: 'sg1.nexus-vps.net', lat: 16 },
    { flag: '🇯🇵', city: 'Tokyo', code: 'jp1.nexus-vps.net', lat: 42 },
    { flag: '🇩🇪', city: 'Frankfurt', code: 'de1.nexus-vps.net', lat: 71 },
    { flag: '🇬🇧', city: 'London', code: 'uk1.nexus-vps.net', lat: 83 },
    { flag: '🇺🇸', city: 'New York', code: 'us1.nexus-vps.net', lat: 96 },
    { flag: '🇦🇺', city: 'Sydney', code: 'au1.nexus-vps.net', lat: 118 },
    { flag: '🇮🇳', city: 'Mumbai', code: 'in1.nexus-vps.net', lat: 35 },
    { flag: '🇧🇷', city: 'São Paulo', code: 'br1.nexus-vps.net', lat: 132 }
  ];
  const nodeList = $('#nodeList');
  nodes.forEach((n, i) => {
    const row = document.createElement('div');
    row.className = 'node-row';
    row.innerHTML = `
      <div class="node-name"><span class="node-flag">${n.flag}</span><span>${n.city}<small>${n.code}</small></span></div>
      <div class="node-latency"><b data-lat="${i}">${n.lat} ms</b><span class="lat-bar"><i data-bar="${i}"></i></span></div>
      <span class="node-state" data-state="${i}">HEALTHY</span>`;
    nodeList.appendChild(row);
  });
  function paintNode(i, lat) {
    const bar = $(`[data-bar="${i}"]`);
    const label = $(`[data-lat="${i}"]`);
    const state = $(`[data-state="${i}"]`);
    label.textContent = lat + ' ms';
    bar.style.width = Math.max(10, 100 - (lat / 160) * 100) + '%';
    bar.style.background = lat > 100 ? 'var(--danger)' : lat > 65 ? 'var(--amber)' : 'var(--green)';
    state.textContent = lat > 100 ? 'SLOW' : 'HEALTHY';
    state.classList.toggle('slow', lat > 100);
  }
  nodes.forEach((n, i) => paintNode(i, n.lat));
  if (!reduceMotion) {
    setInterval(() => {
      let sum = 0;
      nodes.forEach((n, i) => {
        n.lat = Math.max(8, Math.min(165, n.lat + Math.round((Math.random() - 0.5) * 14)));
        paintNode(i, n.lat);
        sum += n.lat;
      });
      $('#avgLatency').textContent = Math.round(sum / nodes.length) + ' ms';
    }, 2600);
  }

  /* ---------------- accordion ---------------- */
  $$('.acc-q').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.acc-item');
      const panel = $('.acc-a', item);
      const open = item.classList.contains('open');
      $$('.acc-item.open').forEach((other) => {
        other.classList.remove('open');
        $('.acc-a', other).style.maxHeight = null;
      });
      if (!open) {
        item.classList.add('open');
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    });
  });

  /* ---------------- card cursor glow ---------------- */
  $$('.feature-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------------- active nav on scroll ---------------- */
  const navLinks = $$('#nav a:not(.nav-cta)');
  const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const navObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => navObs.observe(s));
  }

  /* ---------------- ambient particle canvas ---------------- */
  const canvas = $('#particles');
  if (!reduceMotion) {
    const ctx = canvas.getContext('2d');
    let w, h, dots = [];
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(70, Math.max(24, Math.floor((w * h) / 22000)));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - .5) * .28, vy: (Math.random() - .5) * .28,
        r: Math.random() * 1.4 + .6
      }));
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      const light = root.dataset.theme === 'light';
      const lineColor = light ? '20,110,150' : '90,190,255';
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = light ? 'rgba(10,110,160,.22)' : 'rgba(140,215,255,.3)';
        ctx.fill();
        for (let j = i + 1; j < dots.length; j++) {
          const o = dots[j];
          const dist = Math.hypot(d.x - o.x, d.y - o.y);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(d.x, d.y); ctx.lineTo(o.x, o.y);
            ctx.strokeStyle = `rgba(${lineColor},${(1 - dist / 120) * 0.11})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }
    resize();
    window.addEventListener('resize', resize);
    draw();
  }

  /* ---------------- misc ---------------- */
  $('#year').textContent = new Date().getFullYear();
})();
