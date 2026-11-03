import { supabase } from "@/integrations/supabase/client";

const BUCKET = "equipamentos";

export async function enviarArquivo(arquivo: File, pasta: string): Promise<string> {
  const ext = arquivo.name.split(".").pop() || "jpg";
  const caminho = `${pasta}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return caminho;
}

export async function enviarArquivos(arquivos: File[], pasta: string): Promise<string[]> {
  const resultado: string[] = [];
  for (const arquivo of arquivos) {
    resultado.push(await enviarArquivo(arquivo, pasta));
  }
  return resultado;
}

export async function urlAssinada(caminho: string): Promise<string | null> {
  if (!caminho) return null;
  if (caminho.startsWith("http")) return caminho;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, 60 * 60 * 4);
  return data?.signedUrl ?? null;
}
