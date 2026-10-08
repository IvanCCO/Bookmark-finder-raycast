/**
 * Contrato dos adaptadores de navegador.
 *
 * Cada adaptador sabe ler os favoritos (ou itens fixos) de UM navegador e devolver uma lista
 * simples de BrowserLink. O resto do projeto não sabe nada de formato de arquivo.
 *
 * @typedef {Object} BrowserLink
 * @property {string} space   Agrupador de mais alto nível: space do Arc, perfil do navegador...
 * @property {string} folder  Caminho de pastas, ex.: "Docs / Utils" ("" se estiver na raiz)
 * @property {string} title
 * @property {string} url
 *
 * @typedef {Object} BrowserAdapter
 * @property {string} id            Nome usado em BROWSERS=...
 * @property {string} label         Nome para exibir
 * @property {() => Promise<BrowserLink[]>} read
 * @property {() => string[]} watchFiles  Arquivos que mudam quando os favoritos mudam
 */
export {};
