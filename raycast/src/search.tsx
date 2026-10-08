import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { useState } from "react";
import { Category, Link, SearchResult, serverUrl } from "./api";
import { categoryColor } from "./colors";
import { LinkForm } from "./link-form";

const MIN_CHARS = 3;
const ALL = "all";

/** Corte relativo ao melhor resultado: descarta o que está muito abaixo dele. */
function keepRelevant(results: SearchResult[]) {
  const top = results[0]?.p ?? 0;
  return results.filter((r) => r.p >= Math.max(0.25, top * 0.5));
}

/** O dropdown mistura spaces e categorias; o valor diz de qual tipo é: "space:Vinci" ou "category:IA". */
function filterFrom(value: string) {
  const [kind, ...rest] = value.split(":");
  const name = rest.join(":");
  return { space: kind === "space" ? name : "", category: kind === "category" ? name : "" };
}

export default function Command() {
  const [text, setText] = useState("");
  const [filter, setFilter] = useState(ALL);
  const query = text.trim();

  const { data: links } = useFetch<Link[]>(`${serverUrl()}/api/links`);
  const { data: categories } = useFetch<Category[]>(`${serverUrl()}/api/categories`);
  const untaggedCount = (links ?? []).filter((l) => l.untagged).length;
  const spaces = [...new Set((links ?? []).map((l) => l.space))];

  const { data, isLoading, error, revalidate } = useFetch<{ ms: number; results: SearchResult[] }>(
    `${serverUrl()}/api/search`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, ...filterFrom(filter) }),
      execute: query.length >= MIN_CHARS,
      keepPreviousData: true,
    },
  );

  const results = query.length >= MIN_CHARS ? keepRelevant(data?.results ?? []) : [];

  return (
    <List
      isLoading={isLoading}
      throttle
      onSearchTextChange={setText}
      searchBarPlaceholder="O que você salvou sobre…?"
      searchBarAccessory={
        <List.Dropdown tooltip="Filtrar" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="Tudo" value={ALL} />
          <List.Dropdown.Section title="Spaces">
            {spaces.map((s) => (
              <List.Dropdown.Item key={s} title={s} value={`space:${s}`} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Categorias">
            {(categories ?? []).map((c) => (
              <List.Dropdown.Item key={c.name} title={`${c.name} (${c.count})`} value={`category:${c.name}`} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Servidor do Bookmark Finder fora do ar"
          description={`Rode "npm start" na pasta do projeto (${serverUrl()}).`}
        />
      ) : query.length < MIN_CHARS ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Descreva o que você procura"
          description="Ex.: artigos sobre IA na educação"
        />
      ) : (
        results.map((r) => {
          const tag = (
            <Action.Push
              key="tag"
              title={r.untagged ? "Taguear (Explicar O Que É)" : "Editar Categoria E Descrição"}
              icon={r.untagged ? Icon.Tag : Icon.Pencil}
              shortcut={r.untagged ? undefined : { modifiers: ["cmd"], key: "e" }}
              target={<LinkForm link={r} onSaved={revalidate} />}
            />
          );
          return (
            <List.Item
              key={r.id}
              icon={getFavicon(r.url, { fallback: Icon.Link })}
              title={r.title}
              subtitle={r.untagged ? "Sem tag: não deu para saber o que é. Enter para explicar." : r.description}
              accessories={[
                r.untagged
                  ? {
                      tag: { value: "Sem tag", color: Color.Orange },
                      icon: Icon.Warning,
                      tooltip: "Explique o que é para a IA taguear",
                    }
                  : {
                      tag: { value: r.category || "Outros", color: categoryColor(r.category) },
                      tooltip: [r.space, r.folder].filter(Boolean).join(" / "),
                    },
                { tag: { value: `${Math.round(r.p * 100)}%`, color: r.p >= 0.6 ? Color.Green : Color.SecondaryText } },
              ]}
              actions={
                <ActionPanel>
                  {/* Para link sem tag, a primeira ação (Enter) é taguear. */}
                  {r.untagged && tag}
                  <Action.OpenInBrowser title="Abrir" url={r.url} />
                  <Action.CopyToClipboard
                    title="Copiar URL"
                    content={r.url}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  {!r.untagged && tag}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
