// Registro dos adaptadores. Para suportar outro navegador, crie um arquivo que exporte um
// BrowserAdapter (veja types.mjs) e adicione aqui.
import { arc } from "./arc.mjs";
import { brave, chrome, edge } from "./chromium.mjs";
import { firefox } from "./firefox.mjs";
import { safari } from "./safari.mjs";

export const adapters = Object.fromEntries([arc, chrome, brave, edge, firefox, safari].map((a) => [a.id, a]));

/**
 * Lê os navegadores pedidos. Um navegador com erro não derruba os outros:
 * o erro volta em `errors` para ser mostrado ao usuário.
 */
export async function readBrowsers(ids) {
  const links = [];
  const errors = [];
  for (const id of ids) {
    const adapter = adapters[id];
    if (!adapter) {
      errors.push({ browser: id, message: `navegador desconhecido (opções: ${Object.keys(adapters).join(", ")})` });
      continue;
    }
    try {
      for (const link of await adapter.read()) links.push({ browser: id, ...link });
    } catch (error) {
      errors.push({ browser: id, message: error.message });
    }
  }
  return { links, errors };
}
