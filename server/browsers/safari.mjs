// Safari: favoritos em ~/Library/Safari/Bookmarks.plist (binário). O plist tem campos de dados binários
// que o `plutil -convert json` não aceita, então convertemos com o plistlib do Python que vem no macOS.
// Requer "Acesso Total ao Disco" para o app que roda o servidor (Terminal, iTerm, node...).
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { promisify } from "node:util";

const run = promisify(execFile);
const FILE = `${homedir()}/Library/Safari/Bookmarks.plist`;
const PLIST_TO_JSON = "import plistlib,json,sys; print(json.dumps(plistlib.load(open(sys.argv[1],'rb')), default=lambda o: None))";
const FOLDER_NAMES = { BookmarksBar: "Barra de favoritos", BookmarksMenu: "Menu" };
const SKIPPED_FOLDERS = new Set(["com.apple.ReadingList", "History"]);

/** Percorre a árvore do plist convertido. Exportada para teste. */
export function parseSafariBookmarks(root) {
  const links = [];
  const walk = (node, path) => {
    if (node.WebBookmarkType === "WebBookmarkTypeLeaf" && /^https?:/.test(node.URLString ?? "")) {
      const title = node.URIDictionary?.title || node.URLString;
      links.push({ space: "Safari", folder: path.join(" / "), title, url: node.URLString });
      return;
    }
    if (SKIPPED_FOLDERS.has(node.Title)) return;
    // A raiz não tem título; as demais pastas entram no caminho.
    const nextPath = node.Title && node.WebBookmarkType === "WebBookmarkTypeList" ? [...path, FOLDER_NAMES[node.Title] ?? node.Title] : path;
    for (const child of node.Children ?? []) walk(child, nextPath);
  };
  walk(root, []);
  return links;
}

/** @type {import("./types.mjs").BrowserAdapter} */
export const safari = {
  id: "safari",
  label: "Safari",
  read: async () => {
    try {
      const { stdout } = await run("python3", ["-c", PLIST_TO_JSON, FILE], { maxBuffer: 64 * 1024 * 1024 });
      return parseSafariBookmarks(JSON.parse(stdout));
    } catch (error) {
      if (/Operation not permitted|Permission denied/i.test(String(error.stderr ?? error.message))) {
        throw new Error("Safari: dê Acesso Total ao Disco ao app que roda o servidor (Ajustes → Privacidade e Segurança).");
      }
      throw error;
    }
  },
  watchFiles: () => [FILE],
};
