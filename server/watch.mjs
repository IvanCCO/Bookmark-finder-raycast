// Observa os arquivos dos navegadores e dispara `onChange` quando mudam (com debounce:
// os navegadores gravam várias vezes seguidas).
import { watch } from "node:fs";
import { basename, dirname } from "node:path";
import { adapters } from "./browsers/index.mjs";

export function watchBrowsers(ids, onChange, delayMs = 5000) {
  let timer;
  const trigger = () => {
    clearTimeout(timer);
    timer = setTimeout(onChange, delayMs);
  };

  for (const id of ids) {
    for (const file of adapters[id]?.watchFiles() ?? []) {
      try {
        // Observamos a pasta: alguns navegadores trocam o arquivo por um novo em vez de editá-lo.
        watch(dirname(file), (_event, name) => name === basename(file) && trigger());
      } catch {
        // pasta inexistente (navegador não instalado): ignora
      }
    }
  }
}
