// Servidor HTTP local. A chave do OpenRouter fica aqui; nem o navegador nem o Raycast a veem.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config.mjs";
import { readJson, writeJson } from "./store.mjs";
import { readOverrides, renameCategory, setOverride, toPublicLink } from "./overrides.mjs";
import { expandDescription } from "./pipeline/describe.mjs";
import { FALLBACK_CATEGORY, assignCategories } from "./pipeline/categorize.mjs";
import { sync, syncState } from "./pipeline/sync.mjs";
import { search } from "./search.mjs";
import { watchBrowsers } from "./watch.mjs";

const publicLinks = () => {
  const overrides = readOverrides();
  return readJson("links.json", []).map((link) => toPublicLink(link, overrides));
};

const categoriesWithCount = () => {
  const links = publicLinks();
  const known = readJson("categories.json", []);
  const names = [...known.map((c) => c.name), FALLBACK_CATEGORY];
  return [...new Set([...names, ...links.map((l) => l.category).filter(Boolean)])].map((name) => ({
    name,
    description: known.find((c) => c.name === name)?.description ?? "",
    count: links.filter((l) => l.category === name).length,
  }));
};

/* ---------- rotas ---------- */

const routes = {
  "GET /api/links": () => publicLinks(),

  "GET /api/categories": () => categoriesWithCount(),

  "GET /api/status": () => {
    const links = publicLinks();
    return { total: links.length, needsInput: links.filter((l) => l.needsInput).length, browsers: config.browsers, ...syncState };
  },

  "POST /api/search": async ({ query, space, category }) => {
    const pool = publicLinks().filter((l) => (!space || l.space === space) && (!category || l.category === category));
    return search(String(query ?? ""), pool);
  },

  "POST /api/sync": ({ recluster, regenerate }) => sync({ recluster: Boolean(recluster), regenerate: Boolean(regenerate) }),

  /** Edita um link: categoria, descrição própria ou "descrição simples" para a IA expandir. */
  "POST /api/links/update": async ({ id, category, newCategory, description, simple }) => {
    const link = readJson("links.json", []).find((l) => l.id === id);
    if (!link) throw httpError(404, "link não encontrado");

    const patch = {};
    const chosen = (newCategory || category || "").trim();
    if (chosen) {
      patch.category = chosen;
      const categories = readJson("categories.json", []);
      if (!categories.some((c) => c.name === chosen) && chosen !== FALLBACK_CATEGORY) {
        writeJson("categories.json", [...categories, { name: chosen, description: chosen }]);
      }
    }
    if (simple?.trim()) {
      const expanded = await expandDescription(link, simple.trim());
      Object.assign(patch, pick(expanded, ["description", "keywords"]));
      // Sem categoria escolhida pelo usuário, o Jev decide agora que a descrição existe.
      if (!patch.category) {
        const categories = readJson("categories.json", []);
        const decided = await assignCategories([{ ...link, ...expanded }], categories);
        patch.category = decided.get(link.id)?.category;
      }
    } else if (description?.trim()) patch.description = description.trim();

    setOverride(id, patch);
    return publicLinks().find((l) => l.id === id);
  },

  "POST /api/categories/rename": ({ from, to }) => {
    const state = { categories: readJson("categories.json", []), links: readJson("links.json", []), overrides: readOverrides() };
    renameCategory(from, to, state);
    writeJson("categories.json", state.categories);
    writeJson("links.json", state.links);
    writeJson("overrides.json", state.overrides);
    return categoriesWithCount();
  },
};

/* ---------- servidor ---------- */

const httpError = (status, message) => Object.assign(new Error(message), { status });
const pick = (obj, keys) => Object.fromEntries(keys.map((k) => [k, obj[k]]));

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw httpError(413, "corpo grande demais");
  }
  return raw ? JSON.parse(raw) : {};
}

/**
 * Qualquer site aberto no navegador consegue chamar 127.0.0.1. Para que nenhum deles use o servidor
 * (e a sua chave), só aceitamos requisições sem Origin (Raycast, curl) ou da própria página.
 */
function assertLocalRequest(req) {
  const own = [`127.0.0.1:${config.port}`, `localhost:${config.port}`];
  if (!own.includes(req.headers.host ?? "")) throw httpError(403, "host não permitido");
  const { origin } = req.headers;
  if (origin && !own.some((h) => origin === `http://${h}`)) throw httpError(403, "origem não permitida");
}

createServer(async (req, res) => {
  const send = (status, body, type = "application/json") => {
    res.writeHead(status, { "Content-Type": type });
    res.end(typeof body === "string" ? body : JSON.stringify(body));
  };
  try {
    assertLocalRequest(req);
    const { pathname } = new URL(req.url, "http://localhost");
    if (req.method === "GET" && pathname === "/") {
      return send(200, readFileSync(join(config.webDir, "index.html"), "utf8"), "text/html; charset=utf-8");
    }
    const handler = routes[`${req.method} ${pathname}`];
    if (!handler) throw httpError(404, "rota não encontrada");
    send(200, (await handler(req.method === "POST" ? await readBody(req) : {})) ?? {});
  } catch (error) {
    if (!error.status) console.error(error);
    send(error.status ?? 500, { error: error.message });
  }
}).listen(config.port, "127.0.0.1", () => {
  console.log(`bookmark-finder em http://127.0.0.1:${config.port} (navegadores: ${config.browsers.join(", ")})`);
  const refresh = () => sync().then((r) => console.log(`sync: ${r.total} links, +${r.added} -${r.removed}`)).catch(console.error);
  watchBrowsers(config.browsers, refresh);
  refresh();
});
