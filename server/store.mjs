// Persistência em arquivos JSON dentro de data/ (ignorada pelo git: contém seus links).
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { config } from "./config.mjs";

export function readJson(name, fallback) {
  const file = join(config.dataDir, name);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fallback;
}

/** Escrita atômica: grava num temporário e renomeia, para nunca deixar um JSON pela metade. */
export function writeJson(name, data) {
  mkdirSync(config.dataDir, { recursive: true });
  const file = join(config.dataDir, name);
  writeFileSync(`${file}.tmp`, JSON.stringify(data, null, 1));
  renameSync(`${file}.tmp`, file);
}

/** ID estável: o mesmo link no mesmo navegador/space sempre gera o mesmo ID. */
export function linkId({ browser, space, url }) {
  return createHash("sha1").update(`${browser}|${space}|${url}`).digest("hex").slice(0, 12);
}

/** URL sem query string nem fragmento: podem carregar tokens e IDs de sessão. */
export function safeUrl(url) {
  try {
    const { origin, pathname } = new URL(url);
    return origin + pathname;
  } catch {
    return url;
  }
}
