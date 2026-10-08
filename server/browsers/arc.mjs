// Arc: os itens fixos de cada space ficam no StorableSidebar.json (formato não documentado).
// Estrutura: sidebar.containers[1] = { spaces, items }. `items` é uma lista plana alternando
// IDs (string) e objetos; a árvore se monta seguindo `childrenIds`.
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";

const FILE = `${homedir()}/Library/Application Support/Arc/StorableSidebar.json`;

/** Converte o JSON do sidebar em links. Exportada para teste. */
export function parseArcSidebar(sidebar) {
  const container = sidebar.sidebar.containers[1];
  const items = new Map(container.items.filter((x) => typeof x === "object").map((x) => [x.id, x]));
  const links = [];

  for (const space of container.spaces.filter((x) => typeof x === "object")) {
    // containerIDs é ["pinned", <id>, "unpinned", <id>]: queremos só os fixos.
    const pinnedId = space.containerIDs[space.containerIDs.indexOf("pinned") + 1];
    const seen = new Set();

    const walk = (id, path) => {
      const item = items.get(id);
      if (!item) return;
      const { tab, list } = item.data ?? {};
      if (tab?.savedURL && !seen.has(tab.savedURL)) {
        seen.add(tab.savedURL);
        links.push({
          space: space.title,
          folder: path.join(" / "),
          title: item.title ?? tab.savedTitle ?? tab.savedURL,
          url: tab.savedURL,
        });
      }
      const nextPath = list ? [...path, item.title ?? "pasta"] : path;
      for (const child of item.childrenIds ?? []) walk(child, nextPath);
    };
    walk(pinnedId, []);
  }
  return links;
}

/** @type {import("./types.mjs").BrowserAdapter} */
export const arc = {
  id: "arc",
  label: "Arc",
  read: async () => parseArcSidebar(JSON.parse(await readFile(FILE, "utf8"))),
  watchFiles: () => [FILE],
};
