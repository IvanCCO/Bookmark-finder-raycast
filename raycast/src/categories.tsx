import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Category, SyncResult, post, serverUrl } from "./api";
import { categoryColor } from "./colors";

function RenameForm({ category, onSaved }: { category: Category; onSaved: () => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`Renomear ${category.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Renomear"
            onSubmit={async ({ name }: { name: string }) => {
              await post("/api/categories/rename", { from: category.name, to: name });
              await showToast({ style: Toast.Style.Success, title: "Categoria renomeada" });
              onSaved();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Novo nome"
        defaultValue={category.name}
        info="Se já existir uma categoria com esse nome, as duas são mescladas."
      />
    </Form>
  );
}

export default function Command() {
  const { data, isLoading, error, revalidate } = useFetch<Category[]>(`${serverUrl()}/api/categories`);

  async function regroup() {
    const confirmed = await confirmAlert({
      title: "Reagrupar tudo com IA?",
      message:
        "A IA cria categorias novas do zero. Os nomes que você editou nas categorias serão perdidos; as categorias que você escolheu link a link continuam como estão.",
      primaryAction: { title: "Reagrupar", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Reagrupando…" });
    try {
      const result = await post<SyncResult>("/api/sync", { recluster: true });
      toast.style = Toast.Style.Success;
      toast.title = `${result.total} links reagrupados`;
      revalidate();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = String(e instanceof Error ? e.message : e);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filtrar categorias">
      {error && <List.EmptyView icon={Icon.ExclamationMark} title="Servidor do Bookmark Finder fora do ar" />}
      {(data ?? []).map((c) => (
        <List.Item
          key={c.name}
          title={c.name}
          subtitle={c.description}
          accessories={[{ tag: { value: String(c.count), color: categoryColor(c.name) } }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Renomear Ou Mesclar"
                icon={Icon.Pencil}
                target={<RenameForm category={c} onSaved={revalidate} />}
              />
              <Action title="Reagrupar Tudo Com IA" icon={Icon.Wand} onAction={regroup} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
