// Configuração central: tudo que vem de variável de ambiente ou de caminho de arquivo passa por aqui.
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const config = {
  port: Number(process.env.PORT ?? 5174),
  apiKey: process.env.OPENROUTER_API_KEY,
  /** Navegadores lidos, na ordem. Os nomes batem com os adaptadores em server/browsers. */
  browsers: (process.env.BROWSERS ?? "arc")
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean),
  dataDir: resolve(ROOT, "data"),
  webDir: resolve(ROOT, "web"),
  models: {
    /** Gera descrições e propõe categorias (texto livre). */
    text: process.env.TEXT_MODEL ?? "openai/gpt-6-luna",
    /** Jev: decisões tipadas com probabilidade (busca e categoria). */
    decisions: process.env.DECISIONS_MODEL ?? "~typesafe/jev-latest",
  },
};
