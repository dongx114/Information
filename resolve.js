// 纯函数：给定 registry 记录，决定跳不跳、跳去哪
// 浏览器端和 Node 端共用，方便测试。

export const STALE_MS = 24 * 60 * 60 * 1000; // 本机服务通常整天开着，超过 24 小时没上报才提醒

function hostAllowed(hostname, allow) {
  if (!allow || allow.length === 0) return true; // 没配白名单 = 不限制
  const h = String(hostname).toLowerCase();
  return allow.some((suffix) => {
    const s = String(suffix).toLowerCase().replace(/^\.+|\.+$/g, '');
    return h === s || h.endsWith('.' + s);
  });
}

/**
 * @param {any} registry  { url, status, updated }
 * @param {number} now
 * @param {{allow?: string[]}} [opts]
 * @returns {{state:'fresh'|'stale'|'down'|'missing'|'invalid'|'blocked', url?:string, ageMs?:number, reason?:string}}
 */
export function pickTarget(registry, now = Date.now(), opts = {}) {
  if (!registry || typeof registry !== 'object') return { state: 'missing' };

  const raw = String(registry.url || '').trim();
  if (!raw) return { state: 'missing' };

  let u;
  try { u = new URL(raw); } catch { return { state: 'invalid', reason: 'URL 解析失败' }; }

  // 只允许 https，避免被写成 javascript: / data: 之类的开放重定向跳板
  if (u.protocol !== 'https:') return { state: 'invalid', reason: '仅允许 https' };

  // 只允许白名单后缀，避免这个固定域名被拿去当钓鱼跳板
  if (!hostAllowed(u.hostname, opts.allow)) {
    return { state: 'blocked', reason: '目标域名不在白名单：' + u.hostname };
  }

  const t = Date.parse(String(registry.updated || ''));
  const ageMs = Number.isFinite(t) ? Math.max(0, now - t) : Infinity;
  const url = u.href;

  if (String(registry.status || 'up') === 'down') return { state: 'down', url, ageMs };
  if (ageMs > STALE_MS) return { state: 'stale', url, ageMs };

  return { state: 'fresh', url, ageMs };
}

export function humanAge(ms) {
  if (!Number.isFinite(ms)) return '未知';
  const s = Math.round(ms / 1000);
  if (s < 60) return s + ' 秒前';
  if (s < 3600) return Math.round(s / 60) + ' 分钟前';
  if (s < 86400) return Math.round(s / 3600) + ' 小时前';
  return Math.round(s / 86400) + ' 天前';
}
