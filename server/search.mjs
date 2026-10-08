// Busca em linguagem natural: o Jev dá, para cada link, a probabilidade de ser o que o usuário quer.
import { decide } from "./ai/openrouter.mjs";

const CHUNK = 100;
const MAX_RESULTS = 12;

async function scoreChunk(query, chunk) {
  const questions = Object.fromEntries(
    chunk.map((link) => [
      `k${link.id}`,
      {
        type: "noul",
        instructions: `Este link salvo é um bom resultado para a busca do usuário? Link: "${link.title}" (categoria: ${link.category || "-"}; pasta: ${link.folder || "-"}). O que é: ${link.description}. Palavras-chave: ${link.keywords}.`,
        criteria: {
          false: "Não tem relação com o que o usuário procura.",
          true: "É provavelmente o que o usuário quer abrir.",
        },
      },
    ]),
  );
  const answers = await decide({ questions, state: { busca_do_usuario: query } });
  return chunk.map((link) => ({ link, p: answers[`k${link.id}`]?.noul ?? 0 }));
}

/** @param pool links já no formato público (com edições aplicadas) */
export async function search(query, pool) {
  const started = Date.now();
  const chunks = [];
  for (let i = 0; i < pool.length; i += CHUNK) chunks.push(pool.slice(i, i + CHUNK));
  const scored = (await Promise.all(chunks.map((c) => scoreChunk(query, c)))).flat();
  scored.sort((a, b) => b.p - a.p);
  return {
    ms: Date.now() - started,
    results: scored.slice(0, MAX_RESULTS).map(({ link, p }) => ({ ...link, p })),
  };
}
