import { getPreferenceValues } from "@raycast/api";

export interface Link {
  id: string;
  browser: string;
  space: string;
  folder: string;
  title: string;
  url: string;
  description: string;
  category: string;
  edited: boolean;
  needsInput: boolean;
}

/** Resultado de busca: o link mais a probabilidade (0 a 1) dada pelo Jev. */
export interface SearchResult extends Link {
  p: number;
}

export interface Category {
  name: string;
  description: string;
  count: number;
}

export interface SyncResult {
  total: number;
  added: number;
  removed: number;
  errors: { browser: string; message: string }[];
}

export const serverUrl = () => getPreferenceValues<{ serverUrl?: string }>().serverUrl || "http://127.0.0.1:5174";

/** POST em JSON no servidor local. Lança Error com a mensagem do servidor se algo falhar. */
export async function post<T>(path: string, body: object = {}): Promise<T> {
  const res = await fetch(`${serverUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? res.statusText);
  return json;
}
