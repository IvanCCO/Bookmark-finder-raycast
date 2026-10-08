// Navegadores baseados em Chromium (Chrome, Brave, Edge): um arquivo "Bookmarks" por perfil.
import { readFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const SUPPORT = `${homedir()}/Library/Application Support`;

/** Percorre a árvore de favoritos. Exportada para teste. */
export function parseChromiumBookmarks(bookmarks, space) {
  const links = [];
  const walk = (node, path) => {
    if (node.type === "url" && /^https?:/.test(node.url)) {
      links.push({ space, folder: path.join(" / "), title: node.name || node.url, url: node.url });
    }
    // As pastas-raiz (Barra de favoritos, Outros...) entram no caminho como qualquer pasta.
    const nextPath = node.type === "folder" ? [...path, node.name] : path;
    for (const child of node.children ?? []) walk(child, nextPath);
  };
  for (const root of Object.values(bookmarks.roots ?? {})) {
    if (root && typeof root === "object") walk(root, []);
  }
  return links;
}

/** Perfis existem como pastas "Default", "Profile 1"... com um arquivo Bookmarks dentro. */
async function profiles(dataDir) {
  let names = [];
  try {
    names = (await readdir(dataDir)).filter((n) => n === "Default" || n.startsWith("Profile "));
  } catch {
    return [];
  }
  let labels = {};
  try {
    labels = JSON.parse(await readFile(join(dataDir, "Local State"), "utf8")).profile?.info_cache ?? {};
  } catch {
    // sem nomes amigáveis: usamos o nome da pasta
  }
  return names.map((dir) => ({ dir, name: labels[dir]?.name ?? dir, file: join(dataDir, dir, "Bookmarks") }));
}

/** @returns {import("./types.mjs").BrowserAdapter} */
function chromiumAdapter({ id, label, folder }) {
  const dataDir = join(SUPPORT, folder);
  return {
    id,
    label,
    read: async () => {
      const all = [];
      for (const profile of await profiles(dataDir)) {
        const json = JSON.parse(await readFile(profile.file, "utf8"));
        all.push(...parseChromiumBookmarks(json, profile.name));
      }
      return all;
    },
    watchFiles: () => [join(dataDir, "Default", "Bookmarks")],
  };
}

export const chrome = chromiumAdapter({ id: "chrome", label: "Google Chrome", folder: "Google/Chrome" });
export const brave = chromiumAdapter({ id: "brave", label: "Brave", folder: "BraveSoftware/Brave-Browser" });
export const edge = chromiumAdapter({ id: "edge", label: "Microsoft Edge", folder: "Microsoft Edge" });
