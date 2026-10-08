import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { Link, serverUrl } from "./api";
import { LinkForm } from "./link-form";

/** Fila de links que a IA não soube identificar (página privada, título genérico). */
export default function Command() {
  const { data, isLoading, error, revalidate } = useFetch<Link[]>(`${serverUrl()}/api/links`);
  const pending = (data ?? []).filter((l) => l.needsInput);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Revisar Links (${pending.length})`}
      searchBarPlaceholder="Filtrar links para revisar"
    >
      {error ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Servidor do Bookmark Finder fora do ar" />
      ) : (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="Nada para revisar"
          description="A IA identificou todos os seus links."
        />
      )}
      {pending.map((link) => (
        <List.Item
          key={link.id}
          icon={getFavicon(link.url, { fallback: Icon.Link })}
          title={link.title}
          subtitle={link.url.split("?")[0]}
          accessories={[{ text: link.folder || link.space }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Explicar O Que É"
                icon={Icon.Pencil}
                target={<LinkForm link={link} onSaved={revalidate} />}
              />
              <Action.OpenInBrowser title="Abrir" url={link.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
