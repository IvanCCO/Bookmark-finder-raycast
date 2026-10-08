// Agrupa os links em categorias: o modelo de texto PROPÕE as categorias,
// o Jev DECIDE em qual cada link entra (com probabilidade calibrada).
import { chatStructured, decide } from "../ai/openrouter.mjs";

export const FALLBACK_CATEGORY = "Outros";
const MIN_CONFIDENCE = 0.4;
const CHUNK = 60;
const MAX_LINKS_IN_PROPOSAL = 400;

/** Propõe de 6 a 12 categorias olhando todos os links. @returns {Promise<{name: string, description: string}[]>} */
export async function proposeCategories(links) {
  const sample = links
    .slice(0, MAX_LINKS_IN_PROPOSAL)
    .map((l) => `- ${l.title} (${l.folder || "sem pasta"}): ${l.description ?? ""}`.slice(0, 220))
    .join("\n");
  const { categories } = await chatStructured({
    name: "categories",
    schema: {
      type: "object",
      properties: {
        categories: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" }, description: { type: "string" } },
            required: ["name", "description"],
            additionalProperties: false,
          },
        },
      },
      required: ["categories"],
      additionalProperties: false,
    },
    prompt: `Agrupe os links salvos abaixo em 6 a 12 categorias. Regras:
- name: 1 a 3 palavras, em português do Brasil, fácil de reconhecer numa lista.
- description: uma frase que define o que entra na categoria (será usada para classificar novos links).
- As categorias devem ser distintas entre si e cobrir a maior parte dos links. Não crie uma categoria "${FALLBACK_CATEGORY}".

Links:
${sample}`,
  });
  return categories.filter((c) => c.name.trim() && c.name !== FALLBACK_CATEGORY);
}

/**
 * Atribui uma categoria a cada link com o Jev.
 * @returns {Promise<Map<string, {category: string, confidence: number}>>} por id do link
 */
export async function assignCategories(links, categories) {
  const out = new Map();
  if (categories.length === 0) return out;

  // O Jev responde com a CHAVE da opção; usamos c0, c1... e traduzimos de volta para o nome.
  const criteria = Object.fromEntries(categories.map((c, i) => [`c${i}`, `${c.name}: ${c.description}`]));

  for (let i = 0; i < links.length; i += CHUNK) {
    const chunk = links.slice(i, i + CHUNK);
    const questions = Object.fromEntries(
      chunk.map((link) => [
        `k${link.id}`,
        {
          type: "choice",
          criteria,
          instructions: `Em qual categoria este link salvo se encaixa melhor? Título: "${link.title}". Pasta: ${link.folder || "-"}. O que é: ${link.description ?? "-"}. Palavras-chave: ${link.keywords ?? "-"}.`,
        },
      ]),
    );
    const answers = await decide({ questions, state: { tarefa: "classificar link salvo" } });
    for (const link of chunk) {
      const answer = answers[`k${link.id}`];
      const index = Number(answer?.choice?.slice(1));
      const confidence = answer?.probabilities?.[answer.choice] ?? 0;
      const confident = Number.isInteger(index) && categories[index] && confidence >= MIN_CONFIDENCE;
      out.set(link.id, { category: confident ? categories[index].name : FALLBACK_CATEGORY, confidence });
    }
  }
  return out;
}
