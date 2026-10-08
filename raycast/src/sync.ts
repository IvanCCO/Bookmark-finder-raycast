import { showHUD } from "@raycast/api";
import { SyncResult, post } from "./api";

export default async function Command() {
  try {
    const { total, added, removed, errors } = await post<SyncResult>("/api/sync");
    const problem = errors[0] ? ` · ${errors[0].browser}: ${errors[0].message}` : "";
    await showHUD(`${total} links · +${added} novos · -${removed} removidos${problem}`);
  } catch (error) {
    await showHUD(`Falha ao sincronizar: ${error instanceof Error ? error.message : error}`);
  }
}
