import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArcSidebar } from "../server/browsers/arc.mjs";
import { parseChromiumBookmarks } from "../server/browsers/chromium.mjs";
import { parseFirefoxRows } from "../server/browsers/firefox.mjs";
import { parseSafariBookmarks } from "../server/browsers/safari.mjs";
import { looksLikeLoginWall, parseHtmlMetadata } from "../server/pipeline/metadata.mjs";

test("Arc: lê itens fixos com pastas aninhadas", () => {
  const sidebar = {
    sidebar: {
      containers: [
        { global: {} },
        {
          spaces: [{ id: "s1", title: "Trabalho", containerIDs: ["pinned", "p1", "unpinned", "u1"] }],
          items: [
            "p1", { id: "p1", childrenIds: ["f1", "t2"], data: { itemContainer: {} } },
            "f1", { id: "f1", title: "Docs", childrenIds: ["t1"], data: { list: {} } },
            "t1", { id: "t1", title: "Planilha", childrenIds: [], data: { tab: { savedURL: "https://a.com" } } },
            "t2", { id: "t2", childrenIds: [], data: { tab: { savedTitle: "Raiz", savedURL: "https://b.com" } } },
          ],
        },
      ],
    },
  };
  assert.deepEqual(parseArcSidebar(sidebar), [
    { space: "Trabalho", folder: "Docs", title: "Planilha", url: "https://a.com" },
    { space: "Trabalho", folder: "", title: "Raiz", url: "https://b.com" },
  ]);
});

test("Chromium: percorre pastas e ignora URLs que não são http", () => {
  const json = {
    roots: {
      bookmark_bar: {
        type: "folder", name: "Barra",
        children: [
          { type: "url", name: "Site", url: "https://x.com" },
          { type: "folder", name: "Ler", children: [{ type: "url", name: "Artigo", url: "https://y.com" }] },
          { type: "url", name: "Interno", url: "chrome://settings" },
        ],
      },
    },
  };
  assert.deepEqual(
    parseChromiumBookmarks(json, "Pessoal").map((l) => [l.folder, l.url]),
    [["Barra", "https://x.com"], ["Barra / Ler", "https://y.com"]],
  );
});

test("Firefox: reconstrói o caminho de pastas e pula place:", () => {
  const rows = [
    { id: 1, parent: 0, type: 2, title: "" },
    { id: 3, parent: 1, type: 2, title: "toolbar" },
    { id: 10, parent: 3, type: 2, title: "Estudos" },
    { id: 11, parent: 10, type: 1, title: "Artigo", url: "https://z.com" },
    { id: 12, parent: 3, type: 1, title: "Smart", url: "place:sort=8" },
  ];
  assert.deepEqual(parseFirefoxRows(rows, "default"), [
    { space: "default", folder: "Barra de favoritos / Estudos", title: "Artigo", url: "https://z.com" },
  ]);
});

test("Safari: usa o caminho das listas e ignora a lista de leitura", () => {
  const root = {
    WebBookmarkType: "WebBookmarkTypeList",
    Children: [
      { WebBookmarkType: "WebBookmarkTypeList", Title: "BookmarksBar", Children: [
        { WebBookmarkType: "WebBookmarkTypeLeaf", URLString: "https://a.com", URIDictionary: { title: "A" } },
      ] },
      { WebBookmarkType: "WebBookmarkTypeList", Title: "com.apple.ReadingList", Children: [
        { WebBookmarkType: "WebBookmarkTypeLeaf", URLString: "https://lido.com" },
      ] },
    ],
  };
  assert.deepEqual(parseSafariBookmarks(root), [
    { space: "Safari", folder: "Barra de favoritos", title: "A", url: "https://a.com" },
  ]);
});

test("metadados: lê title, description e og:*, em qualquer ordem de atributos", () => {
  const html = `<head><title>Olá &amp; mundo</title>
    <meta content="Descrição normal" name="description">
    <meta property="og:description" content="Descrição OG">
    <meta property="og:site_name" content="Meu Site"></head>`;
  assert.deepEqual(parseHtmlMetadata(html), { title: "Olá & mundo", description: "Descrição OG", siteName: "Meu Site" });
});

test("metadados: detecta tela de login", () => {
  assert.equal(looksLikeLoginWall({ status: 200, finalUrl: "https://app.com/login", title: "App" }), true);
  assert.equal(looksLikeLoginWall({ status: 200, finalUrl: "https://app.com/home", title: "Entrar na conta" }), true);
  assert.equal(looksLikeLoginWall({ status: 403, finalUrl: "https://app.com/x", title: "" }), true);
  assert.equal(looksLikeLoginWall({ status: 200, finalUrl: "https://blog.com/post", title: "Um post" }), false);
});
