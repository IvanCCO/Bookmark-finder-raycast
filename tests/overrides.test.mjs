import { test } from "node:test";
import assert from "node:assert/strict";
import { pruneOverrides, renameCategory, toPublicLink } from "../server/overrides.mjs";

const link = { id: "a", title: "T", url: "https://a.com", description: "IA", category: "Educação", clear: false };

test("edição do usuário vence a IA e tira o link da fila de revisão", () => {
  assert.equal(toPublicLink(link, {}).needsInput, true);
  const edited = toPublicLink(link, { a: { description: "Minha descrição", category: "Trabalho" } });
  assert.deepEqual([edited.description, edited.category, edited.needsInput, edited.edited], ["Minha descrição", "Trabalho", false, true]);
});

test("link que a IA não identificou aparece sem tag, sem palpite de categoria ou descrição", () => {
  const view = toPublicLink(link, {});
  assert.deepEqual([view.untagged, view.category, view.description], [true, "", ""]);
});

test("renomear uma categoria atualiza links e edições", () => {
  const state = {
    categories: [{ name: "Educação", description: "" }],
    links: [{ id: "a", category: "Educação" }],
    overrides: { b: { category: "Educação" } },
  };
  renameCategory("Educação", "Estudos", state);
  assert.equal(state.categories[0].name, "Estudos");
  assert.equal(state.links[0].category, "Estudos");
  assert.equal(state.overrides.b.category, "Estudos");
});

test("renomear para uma categoria que já existe mescla as duas", () => {
  const state = {
    categories: [{ name: "A", description: "" }, { name: "B", description: "" }],
    links: [{ id: "x", category: "A" }],
    overrides: {},
  };
  renameCategory("A", "B", state);
  assert.deepEqual(state.categories.map((c) => c.name), ["B"]);
  assert.equal(state.links[0].category, "B");
});

test("edições de links removidos do navegador são descartadas", () => {
  const overrides = { a: { category: "X" }, b: { category: "Y" } };
  assert.deepEqual(pruneOverrides(overrides, ["a"]), { a: { category: "X" } });
});
