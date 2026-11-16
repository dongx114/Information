import { pickTarget, humanAge } from './resolve.js';
import { ALLOWED_HOST_SUFFIXES } from './allow.js';

const REGISTRY = './registry.json';       // 由本机自动覆盖
const POLL_MS = 20000;                    // 等待期间轮询间隔
const REDIRECT_DELAY = 400;

const el = (id) => document.getElementById(id);
const dot = el('dot'), stateText = el('state'), targetEl = el('target');
const goBtn = el('go'), updatedEl = el('updated'), countdownEl = el('countdown');

let lastUrl = '';
let timer = null;
let lastState = '';

function paint(state, info) {
  dot.className = 'dot ' + (state === 'fresh' ? 'ok' : state === 'stale' ? 'warn' : state === 'missing' ? '' : 'bad');
  stateText.textContent = {
    fresh: '已连接 · 即将跳转',
    stale: '地址可能已过期',
    down: '本机项目已离线',
    missing: '还没有收到本机上报的地址',
    invalid: '上报的地址不合法',
    blocked: '目标域名不在白名单，已阻止跳转',
  }[state] || state;
  lastState = state;

  if (info && info.url) {
    targetEl.textContent = info.url.replace(/^https:\/\//, '');
    targetEl.style.color = state === 'fresh' ? '#7ee787' : '#8b98a5';
    goBtn.disabled = false;
  } else {
    targetEl.textContent = '—';
  }

  updatedEl.textContent = info && Number.isFinite(info.ageMs) ? '更新于 ' + humanAge(info.ageMs) : '—';
}

async function load({ redirect = true } = {}) {
  let reg;
  try {
    // 关键：加时间戳参数 + no-store，绕开静态站/CDN 缓存
    const res = await fetch(REGISTRY + '?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    reg = await res.json();
  } catch (e) {
    paint('missing', {});
    stateText.textContent = '读取地址失败：' + e.message;
    schedule();
    return null;
  }

  const info = pickTarget(reg, Date.now(), { allow: ALLOWED_HOST_SUFFIXES });
  paint(info.state, info);

  // ?stay=1 用于调试：只显示状态，不自动跳走
  const stay = new URLSearchParams(location.search).has('stay');
  if (info.state === 'fresh' && redirect && !stay) {
    if (info.url !== lastUrl) {
      lastUrl = info.url;
      let n = Math.ceil(REDIRECT_DELAY / 1000);
      countdownEl.textContent = n + 's 后跳转';
      setTimeout(() => { location.replace(info.url); }, REDIRECT_DELAY);
    }
  } else if (info.state !== 'fresh') {
    schedule();
  }
  return info;
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(() => load({ redirect: true }), POLL_MS);
}

goBtn.addEventListener('click', () => {
  if (lastState === 'blocked' || lastState === 'invalid') return;
  const url = targetEl.textContent;
  if (url && url !== '—') location.replace('https://' + url);
  else load({ redirect: true });
});

load();
