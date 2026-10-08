// Cliente mínimo do OpenRouter: texto estruturado (chat) e decisões do Jev.
import { config } from "../config.mjs";

async function post(path, body) {
  if (!config.apiKey) throw new Error("OPENROUTER_API_KEY ausente. Copie .env.example para .env e preencha.");
  const res = await fetch(`https://openrouter.ai/api${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${JSON.stringify(json.error ?? json)}`);
  return json;
}

/** Pede ao modelo de texto uma resposta que obedece a um JSON Schema estrito. */
export async function chatStructured({ name, schema, prompt }) {
  const json = await post("/v1/chat/completions", {
    model: config.models.text,
    reasoning: { effort: "low" },
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_schema", json_schema: { name, strict: true, schema } },
  });
  return JSON.parse(json.choices[0].message.content);
}

/**
 * Jev (modelo de decisões): recebe perguntas tipadas e um estado, devolve respostas com probabilidade.
 * Tipos usados aqui: "noul" (sim/não com probabilidade) e "choice" (uma opção entre várias).
 */
export async function decide({ questions, state }) {
  const json = await post("/alpha/decisions", { model: config.models.decisions, questions, state });
  return json.answers;
}

/** Monta um schema estrito onde cada chave é um objeto com os mesmos campos. */
export function keyedSchema(keys, fields) {
  const item = { type: "object", properties: fields, required: Object.keys(fields), additionalProperties: false };
  return {
    type: "object",
    properties: Object.fromEntries(keys.map((key) => [key, item])),
    required: keys,
    additionalProperties: false,
  };
}
