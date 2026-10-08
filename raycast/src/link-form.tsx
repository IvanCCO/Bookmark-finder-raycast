import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Category, Link, post, serverUrl } from "./api";

interface Props {
  link: Link;
  onSaved?: () => void;
}

interface Values {
  category: string;
  newCategory: string;
  simple: string;
  expand: boolean;
}

/** Edita um link: troca a categoria e/ou explica o que ele é para a IA escrever a descrição. */
export function LinkForm({ link, onSaved }: Props) {
  const { pop } = useNavigation();
  const { data: categories = [] } = useFetch<Category[]>(`${serverUrl()}/api/categories`);

  async function save(values: Values) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Salvando…" });
    try {
      const text = values.simple.trim();
      await post("/api/links/update", {
        id: link.id,
        category: values.category,
        newCategory: values.newCategory,
        // Com "expandir", o texto vai como `simple` (a IA escreve a descrição); sem, vira a descrição.
        ...(values.expand ? { simple: text } : { description: text }),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Link atualizado";
      onSaved?.();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Não foi possível salvar";
      toast.message = String(error instanceof Error ? error.message : error);
    }
  }

  return (
    <Form
      navigationTitle={link.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Salvar" onSubmit={save} />
        </ActionPanel>
      }
    >
      <Form.Description title="Link" text={`${link.title}\n${link.url.split("?")[0]}`} />
      <Form.Description title="Descrição atual" text={link.description || "—"} />
      <Form.Separator />
      <Form.TextArea
        id="simple"
        title="O que é isso?"
        placeholder="Ex.: planilha onde controlo os clientes e os pagamentos"
        info="Escreva do seu jeito, em poucas palavras (ou dite com fn fn). A IA transforma numa descrição completa e escolhe a categoria."
      />
      <Form.Checkbox id="expand" label="Gerar a descrição completa com IA a partir do que escrevi" defaultValue />
      <Form.Separator />
      <Form.Dropdown id="category" title="Categoria" defaultValue={link.category}>
        {!link.category && <Form.Dropdown.Item value="" title="Deixar a IA escolher" />}
        {categories.map((c) => (
          <Form.Dropdown.Item key={c.name} value={c.name} title={c.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="newCategory" title="Nova categoria" placeholder="Opcional: cria e usa esta categoria" />
    </Form>
  );
}
