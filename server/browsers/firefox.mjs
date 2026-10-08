// Firefox: favoritos em places.sqlite (um por perfil). O banco fica travado enquanto o navegador
// está aberto, então lemos uma cópia. Usa o `sqlite3` que já vem no macOS.
import { execFile } from "node:child_process";
import { copyFile, mkdtemp, readdir, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const PROFILES = `${homedir()}/Library/Application Support/Firefox/Profiles`;
const ROOT_NAMES = { menu: "Menu", toolbar: "Barra de favoritos", unfiled: "Outros", mobile: "Celular" };

/** Monta links a partir das linhas (id, parent, type, title, url) do banco. Exportada para teste. */
export function parseFirefoxRows(rows, space) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const pathOf = (row) => {
    const names = [];
    for (let p = byId.get(row.parent); p && p.parent !== 0 && p.parent != null; p = byId.get(p.parent)) {
      names.unshift(ROOT_NAMES[p.title] ?? p.title);
    }
    return names.filter(Boolean).join(" / ");
  };
  return rows
    .filter((row) => row.type === 1 && /^https?:/.test(row.url ?? ""))
    .map((row) => ({ space, folder: pathOf(row), title: row.title || row.url, url: row.url }));
}

async function readProfile(dir) {
  const tmp = await mkdtemp(join(tmpdir(), "bookmark-finder-"));
  try {
    const db = join(tmp, "places.sqlite");
    await copyFile(join(PROFILES, dir, "places.sqlite"), db);
    await copyFile(join(PROFILES, dir, "places.sqlite-wal"), `${db}-wal`).catch(() => {}); // pode não existir
    const sql = "SELECT b.id, b.parent, b.type, b.title, p.url FROM moz_bookmarks b LEFT JOIN moz_places p ON p.id = b.fk";
    const { stdout } = await run("sqlite3", ["-json", db, sql], { maxBuffer: 64 * 1024 * 1024 });
    return parseFirefoxRows(JSON.parse(stdout || "[]"), dir.split(".").slice(1).join(".") || dir);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

/** @type {import("./types.mjs").BrowserAdapter} */
export const firefox = {
  id: "firefox",
  label: "Firefox",
  read: async () => {
    const dirs = await readdir(PROFILES).catch(() => []);
    const lists = await Promise.all(dirs.filter((d) => !d.startsWith(".")).map(readProfile));
    return lists.flat();
  },
  watchFiles: () => [],
};
