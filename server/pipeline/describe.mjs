// Escreve a descrição de cada link com o modelo de texto (OpenRouter).
import { chatStructured, keyedSchema } from "../ai/openrouter.mjs";
import { safeUrl } from "../store.mjs";

const BATCH = 20;

const FIELDS = {
  description: { type: "string" },
  keywords: { type: "string" },
  clear: { type: "boolean" },
};

const RULES = `Para cada link salvo, escreva em português do Brasil:
- description: 1 ou 2 frases curtas (máx. 30 palavras) dizendo o que é e para que serve. Use a descrição da página quando existir.
- keywords: 6 a 10 palavras-chave separadas por vírgula, com sinônimos e termos em inglês que alguém usaria para procurar o link.
- clear: true se título, URL e descrição bastam para saber do que se trata; false se você estaria chutando (página privada, título genérico). Nunca invente.
A description descreve só o que o link é; nunca comente falta de informação (nada de "o título não esclarece"). Se não souber, diga apenas o que dá para ver (ex.: "Documento PDF.") e marque clear = false.`;

function describeInput(link, index) {
  const meta = link.meta?.status === "ok" ? ` | descrição da página: ${link.meta.description || "-"} | site: ${link.meta.siteName || "-"}` : " | página privada ou inacessível";
  return `l${index} | pasta: ${link.folder || "-"} | título: ${link.title} | url: ${safeUrl(link.url)}${meta}`;
}

/** @returns {Promise<Map<string, {description: string, keywords: string, clear: boolean}>>} por id do link */
export async function describeLinks(links) {
  const out = new Map();
  for (let i = 0; i < links.length; i += BATCH) {
    const batch = links.slice(i, i + BATCH);
    const keys = batch.map((_, j) => `l${j}`);
    const answer = await chatStructured({
      name: "descriptions",
      schema: keyedSchema(keys, FIELDS),
      prompt: `${RULES}\n\n${batch.map(describeInput).join("\n")}`,
    });
    batch.forEach((link, j) => out.set(link.id, answer[`l${j}`]));
  }
  return out;
}

/** Transforma a descrição simples do usuário ("planilha onde controlo os clientes") numa descrição completa. */
export async function expandDescription(link, simple) {
  const answer = await chatStructured({
    name: "expanded",
    schema: keyedSchema(["link"], FIELDS).properties.link,
    prompt: `${RULES}\n\nO usuário explicou o que é este link com as próprias palavras. Considere a explicação dele a verdade e use-a como base (clear = true).\n\nExplicação do usuário: ${simple}\n${describeInput(link, 0)}`,
  });
  return { ...answer, clear: true };
}
