// Sincronização: lê os navegadores, descobre o que é novo e enriquece só isso
// (metadados da página → descrição → categoria). O que já foi processado não é refeito.
import { config } from "../config.mjs";
import { readBrowsers } from "../browsers/index.mjs";
import { readJson, writeJson, linkId } from "../store.mjs";
import { fetchMetadataMany } from "./metadata.mjs";
import { describeLinks } from "./describe.mjs";
import { assignCategories, proposeCategories } from "./categorize.mjs";

export const syncState = { running: false, lastRun: null, lastResult: null };
let inFlight = null;

/** Só uma sincronização por vez; chamadas simultâneas esperam a mesma. */
export function sync(options = {}) {
  inFlight ??= run(options).finally(() => (inFlight = null));
  return inFlight;
}

async function run({ recluster = false } = {}) {
  syncState.running = true;
  try {
    const result = await syncOnce({ recluster });
    syncState.lastResult = result;
    return result;
  } finally {
    syncState.running = false;
    syncState.lastRun = new Date().toISOString();
  }
}

async function syncOnce({ recluster }) {
  const { links: found, errors } = await readBrowsers(config.browsers);
  const stored = new Map(readJson("links.json", []).map((l) => [l.id, l]));

  // Se nenhum navegador pôde ser lido, não apagamos o que já temos.
  if (found.length === 0 && errors.length > 0) return { total: stored.size, added: 0, removed: 0, errors };

  // Mantém o que a IA já sabe de cada link; título e pasta vêm sempre do navegador.
  const byId = new Map();
  for (const link of found) {
    const id = linkId(link);
    byId.set(id, { ...stored.get(id), ...link, id });
  }
  const links = [...byId.values()];
  const added = links.filter((l) => !stored.has(l.id)).length;
  const removed = [...stored.keys()].filter((id) => !byId.has(id)).length;
  const aiErrors = [];

  try {
    await enrich(links.filter((l) => !l.description));
    await categorize(links, recluster);
  } catch (error) {
    // Salvamos o que deu certo; o que faltou é refeito na próxima sincronização.
    aiErrors.push({ browser: "ai", message: error.message });
  }

  writeJson("links.json", links);
  return { total: links.length, added, removed, errors: [...errors, ...aiErrors] };
}

/** Metadados da página + descrição escrita pela IA, para links nunca processados. */
async function enrich(fresh) {
  if (fresh.length === 0) return;
  const metadata = await fetchMetadataMany(fresh.map((l) => l.url));
  for (const link of fresh) link.meta = metadata.get(link.url);

  const described = await describeLinks(fresh);
  for (const link of fresh) Object.assign(link, described.get(link.id), { addedAt: new Date().toISOString() });
}

/** Propõe categorias (na primeira vez ou a pedido) e classifica os links sem categoria. */
async function categorize(links, recluster) {
  let categories = readJson("categories.json", []);
  if (recluster || categories.length === 0) {
    categories = await proposeCategories(links);
    writeJson("categories.json", categories);
  }
  const pending = recluster ? links : links.filter((l) => !l.category);
  const assigned = await assignCategories(pending, categories);
  for (const link of pending) {
    const result = assigned.get(link.id);
    if (result) Object.assign(link, { category: result.category, categoryConfidence: result.confidence });
  }
}
