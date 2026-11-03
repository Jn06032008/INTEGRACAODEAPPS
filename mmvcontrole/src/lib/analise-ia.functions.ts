import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SISTEMA = `Você é um técnico de equipamentos audiovisuais (câmeras, lentes, gimbals, baterias, rádios).
Analise as fotos de devolução e a descrição do operador. Identifique possíveis danos visíveis
(riscos, trincas, amassados, sujeira, peças soltas ou faltando, lente arranhada, conector danificado).
Seja objetivo e não invente o que não aparece. Responda em português do Brasil, no máximo 180 palavras,
exatamente neste formato:
GRAVIDADE: <nenhum | leve | moderado | grave>
CONDIÇÃO GERAL: <uma frase>
POSSÍVEIS DANOS:
- <item, ou "Nenhum dano visível">
RECOMENDAÇÃO: <liberar para uso | limpeza | revisão técnica | manutenção urgente> — <motivo curto>`;

export type AnaliseIA = { ok: true; relatorio: string; gravidade: string } | { ok: false; erro: string };

export const analisarDevolucao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        equipamento: z.string().max(200),
        descricao: z.string().max(2000),
        fotos: z.array(z.string().min(1).max(500)).min(1).max(6),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<AnaliseIA> => {
    const { data: assinadas, error } = await context.supabase.storage
      .from("equipamentos")
      .createSignedUrls(data.fotos, 600);
    const urls = (assinadas ?? []).map((a) => a.signedUrl).filter(Boolean) as string[];
    if (error || urls.length === 0) return { ok: false, erro: "Não consegui abrir as fotos" };
    const { gerarTexto } = await import("./ai-gateway.server");
    try {
      const relatorio = await gerarTexto(
        [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Equipamento: ${data.equipamento}\nDescrição do operador: ${data.descricao || "(sem descrição)"}`,
              },
              ...urls.map((u) => ({ type: "file" as const, data: new URL(u), mediaType: "image/jpeg" })),
            ],
          },
        ],
        SISTEMA,
      );
      const gravidade = /GRAVIDADE:\s*(\S+)/i.exec(relatorio)?.[1]?.toLowerCase() ?? "";
      return { ok: true, relatorio, gravidade };
    } catch (e) {
      const status = (e as { status?: number }).status;
      console.error("analisarDevolucao", status, e);
      if (status === 402 || status === 403) return { ok: false, erro: "Créditos de IA esgotados ou bloqueados no espaço de trabalho." };
      if (status === 429) return { ok: false, erro: "Muitas análises agora. Tente de novo em instantes." };
      return { ok: false, erro: "A análise automática falhou. Tente novamente." };
    }
  });
