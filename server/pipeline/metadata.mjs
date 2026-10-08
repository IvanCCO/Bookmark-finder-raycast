// Busca os metadados públicos de uma página (título, descrição, site).
// Sem cookies e sem sessão: se a página exige login, não tentamos "entrar", só registramos que é privada.

const TIMEOUT_MS = 6000;
const MAX_BYTES = 200_000;
const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|\[::1\])/;
const LOGIN_PATH = /\/(log-?in|sign-?in|signin|auth|sso|oauth|accounts?)(\/|$|\?)/i;
const LOGIN_TITLE = /\b(log ?in|sign ?in|entrar|acessar|faça login|fazer login)\b/i;
const LOGIN_HOSTS = new Set(["accounts.google.com", "login.microsoftonline.com", "github.com/login"]);

const decode = (text = "") =>
  text
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ").trim();

/** Lê o valor de <meta name|property="..." content="...">, em qualquer ordem de atributos. */
function metaContent(html, key) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = /(?:name|property)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    if (name !== key) continue;
    const content = /content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i.exec(tag);
    if (content) return decode(content[1] ?? content[2]);
  }
  return "";
}

/** Extrai os metadados de um HTML. Exportada para teste. */
export function parseHtmlMetadata(html) {
  const title = decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]) || metaContent(html, "og:title");
  return {
    title,
    description: metaContent(html, "og:description") || metaContent(html, "description"),
    siteName: metaContent(html, "og:site_name"),
  };
}

/** Heurística de "caiu numa tela de login". Exportada para teste. */
export function looksLikeLoginWall({ status, finalUrl, title }) {
  if (status === 401 || status === 403) return true;
  const { hostname, pathname } = new URL(finalUrl);
  return LOGIN_HOSTS.has(hostname) || LOGIN_PATH.test(pathname) || LOGIN_TITLE.test(title ?? "");
}

/** @returns {Promise<{status: "ok"|"private"|"error", title?: string, description?: string, siteName?: string}>} */
export async function fetchMetadata(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { status: "error" };
  }
  if (!/^https?:$/.test(parsed.protocol) || PRIVATE_HOST.test(parsed.hostname)) return { status: "private" };

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; bookmark-finder)", Accept: "text/html" },
    });
    if (!(res.headers.get("content-type") ?? "").includes("html")) return { status: "ok" };

    // Só o começo do HTML interessa (<head>); evita baixar páginas enormes.
    const reader = res.body.getReader();
    let html = "";
    while (html.length < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value, { stream: true });
    }
    reader.cancel().catch(() => {});

    const meta = parseHtmlMetadata(html);
    return looksLikeLoginWall({ status: res.status, finalUrl: res.url, title: meta.title })
      ? { status: "private" }
      : { status: "ok", ...meta };
  } catch {
    return { status: "error" };
  }
}

/** Busca vários links com no máximo `concurrency` requisições ao mesmo tempo. */
export async function fetchMetadataMany(urls, concurrency = 8) {
  const out = new Map();
  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const url = urls[next++];
      out.set(url, await fetchMetadata(url));
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
  return out;
}
