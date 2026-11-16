// 白名单：只允许跳到这些后缀的域名。
// 这是防"开放重定向"的关键——别人就算能改 registry.json，也跳不到自己站点去钓鱼。
// 留空数组 [] 表示不限制（不建议）。
export const ALLOWED_HOST_SUFFIXES = [
  'trycloudflare.com',   // cloudflared 快速隧道
  'ngrok-free.app',      // ngrok 免费版
  'ngrok.io',
  'ngrok.app',
  'lhr.life',            // localhost.run
  'serveo.net',
  'duckdns.org',         // 免费固定子域名（方案 B）
];
