# Bookmark Finder

Encontre o que você salvou descrevendo o que procura: *"artigos sobre IA na educação"*, *"planilha de clientes"*.
Lê os favoritos (ou os itens fixos, no Arc) do seu navegador, entende do que cada link se trata com IA e mostra os
melhores candidatos no **Raycast**, com categoria e porcentagem de confiança.

- **Descrições e categorias automáticas.** Cada link novo é analisado uma vez (metadados públicos da página + IA).
- **Você manda.** Troque a categoria, renomeie ou mescle categorias e reescreva descrições. Suas edições nunca são
  sobrescritas pela IA.
- **A IA pergunta quando não sabe.** Páginas privadas ou com título genérico caem em "Revisar Links": você explica em
  poucas palavras e a IA escreve a descrição completa.
- **Vários navegadores.** Arc, Chrome, Brave, Edge, Firefox e Safari. Cada um é um adaptador pequeno e isolado.
- **Local.** Tudo roda na sua máquina; só o texto dos links vai para o OpenRouter.

## Como funciona

```
 navegador ──► adaptador ──► sync ──► metadados da página ──► descrição (texto) ──► categoria (Jev)
 (arquivo local)  server/browsers      server/pipeline                                    │
                                                                                          ▼
 Raycast ◄──────────── API local (127.0.0.1) ◄──────────── data/*.json  ◄───────── busca (Jev)
```

| IA | Para quê | Modelo (padrão) |
| --- | --- | --- |
| Modelo de texto | Escrever descrições e **propor** as categorias | `openai/gpt-6-luna` |
| [Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev) (modelo de decisões) | **Decidir** a categoria de cada link e ranquear a busca, com probabilidade calibrada | `~typesafe/jev-latest` |

O Jev só devolve decisões tipadas (não gera texto), então é rápido e barato: a busca em ~300 links leva cerca de 1 s.

## Instalação

Requisitos: macOS, Node 22+, [Raycast](https://raycast.com) (o plano grátis basta) e uma chave do
[OpenRouter](https://openrouter.ai/keys).

```bash
git clone https://github.com/IvanCCO/Bookmark-finder-raycast.git
cd Bookmark-finder-raycast
cp .env.example .env        # preencha OPENROUTER_API_KEY e BROWSERS
npm run sync                # primeira leitura: baixa metadados, descreve e categoriza
npm start                   # sobe o servidor em http://127.0.0.1:5174
```

Para o servidor subir sozinho no login: `./scripts/install-launchd.sh` (remova com `./scripts/uninstall-launchd.sh`).

Extensão do Raycast:

```bash
cd raycast
npm install
npm run dev                 # registra a extensão no Raycast (pode fechar depois)
```

No Raycast, dê um atalho ao comando **Buscar Favoritos** (Settings → Extensions → Bookmark Finder).

## Comandos do Raycast

| Comando | O que faz |
| --- | --- |
| **Buscar Favoritos** | Busca em linguagem natural. Filtra por space ou categoria. `⌘E` edita categoria e descrição. |
| **Revisar Links** | Links que a IA não soube identificar: explique o que são. |
| **Gerenciar Categorias** | Renomeie, mescle ou peça para a IA reagrupar tudo. |
| **Sincronizar Favoritos** | Lê o navegador agora (também acontece sozinho quando os favoritos mudam). |

## Navegadores

Configure em `.env`: `BROWSERS=arc,chrome,safari` (separados por vírgula).

| Navegador | De onde lê | Observação |
| --- | --- | --- |
| `arc` | `StorableSidebar.json` | Itens **fixos** de cada space, com pastas. Formato não documentado; pode mudar. |
| `chrome`, `brave`, `edge` | `Bookmarks` de cada perfil | Space = nome do perfil. |
| `firefox` | `places.sqlite` (cópia) | Usa o `sqlite3` do macOS. |
| `safari` | `Bookmarks.plist` | Precisa de **Acesso Total ao Disco** para o app que roda o servidor. |

Para adicionar outro navegador, crie `server/browsers/<nome>.mjs` exportando um adaptador (veja `types.mjs`: `id`,
`label`, `read()`, `watchFiles()`) e registre em `server/browsers/index.mjs`.

## Privacidade

- A chave fica só no servidor local (`.env`, ignorado pelo git). O Raycast e o navegador nunca a veem.
- O servidor só aceita requisições locais e recusa chamadas vindas de sites abertos no navegador (checagem de
  `Host` e `Origin`).
- Os metadados são buscados **sem cookies**: páginas que exigem login não são lidas, só ficam marcadas como privadas.
- Para a IA vão título, pasta, URL **sem query string**, e a descrição pública da página. Nada de páginas privadas.
- `data/` (seus links, descrições e edições) também é ignorado pelo git.

## Desenvolvimento

```bash
npm test                    # testes dos parsers de cada navegador, metadados e edições
npm run status              # contagem por categoria
npm run recluster           # a IA refaz as categorias do zero
```

```
server/
  browsers/    um adaptador por navegador (lê favoritos → lista simples de links)
  pipeline/    sync, metadata, describe, categorize
  ai/          cliente do OpenRouter (texto estruturado e Jev)
  overrides.mjs  edições manuais do usuário (prioridade sobre a IA)
  search.mjs   busca com o Jev
raycast/       extensão do Raycast (TypeScript)
web/           demo opcional: ícones caindo com física (http://127.0.0.1:5174)
```

> O campo `author` da extensão não é um usuário real do Raycast Store; troque-o se for publicá-la lá.

## Licença

MIT
