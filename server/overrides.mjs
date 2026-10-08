// Edições manuais do usuário. Têm prioridade sobre a IA e nunca são sobrescritas por uma sincronização.
import { readJson, writeJson } from "./store.mjs";

const FILE = "overrides.json";

/** @returns {Record<string, {category?: string, description?: string, keywords?: string}>} por id do link */
export const readOverrides = () => readJson(FILE, {});

export function setOverride(id, patch) {
  const all = readOverrides();
  all[id] = { ...all[id], ...patch };
  writeJson(FILE, all);
}

/** Aplica as edições do usuário a um link e devolve o formato público (o que a API entrega). */
export function toPublicLink(link, overrides) {
  const edit = overrides[link.id] ?? {};
  const description = edit.description ?? link.description ?? "";
  return {
    id: link.id,
    browser: link.browser,
    space: link.space,
    folder: link.folder,
    title: link.title,
    url: link.url,
    description,
    keywords: edit.keywords ?? link.keywords ?? "",
    category: edit.category ?? link.category ?? "",
    categoryConfidence: link.categoryConfidence ?? 0,
    edited: Boolean(edit.category || edit.description),
    // Precisa da sua ajuda: a IA não soube dizer o que é e você ainda não explicou.
    needsInput: link.clear === false && !edit.description,
  };
}

/** Renomeia (ou mescla, se `to` já existe) uma categoria em todos os lugares. */
export function renameCategory(from, to, { categories, links, overrides }) {
  const target = to.trim();
  if (!target || target === from) return;
  const existing = categories.find((c) => c.name === target);
  const source = categories.find((c) => c.name === from);
  if (existing) categories.splice(categories.indexOf(source), 1); // mescla: some a antiga
  else if (source) source.name = target;
  for (const link of links) if (link.category === from) link.category = target;
  for (const edit of Object.values(overrides)) if (edit.category === from) edit.category = target;
}
