# Situação do app MMV Produção — relatório e próximos passos

## Estado geral

O aplicativo está no ar, sem erros, com o inventário real já carregado: 109 equipamentos em 10 locais e 25 categorias. Existem 5 contas cadastradas (as 4 de perfil + 1 criada no formulário). Nenhuma movimentação foi feita ainda: retiradas, devoluções, conferências, manutenções, assistências, limpezas, kits e avisos estão todos em zero — o app está limpo, pronto para o primeiro uso real.

## O que já funciona

- Entrada com e-mail e senha, "olhinho" para ver a senha, recuperação de senha e cadastro da própria conta pela equipe.
- Perfis e permissões: Administrador, Coordenador, Operador e Técnico.
- Painel com contagens por situação, itens que precisam de atenção e últimas movimentações.
- Inventário com busca (nome, patrimônio, série, código, marca, modelo) e filtros por situação e categoria.
- Cadastro e ficha do equipamento: fotos, acessórios, documentos, histórico e ações rápidas.
- Etiquetas QR Code: individual, download e impressão em folha A4; leitura pela câmera do celular.
- Retirada com termo de responsabilidade, assinatura na tela, fotos obrigatórias e bloqueio de item quebrado/em manutenção/já retirado.
- Devolução com fotos, conferência de acessórios, relato de problema e assinatura.
- Conferência em duas etapas: a coordenação libera para disponível ou encaminha para limpeza, revisão, manutenção ou assistência.
- Pendências, manutenção, assistência técnica, limpeza, kits, movimentações, relatórios com exportação e página de usuários.
- Seta de voltar no canto superior esquerdo em todas as telas.

## O que ainda falta

1. **Reservas de equipamento** (agendar uso para um culto/evento com bloqueio de conflito de horário) — previsto, ainda não construído.
2. **Central de avisos** — os avisos já são gravados no banco, mas não existe tela com sininho para a pessoa ler.
3. **Gráficos no painel** — hoje só há números e listas; faltam os gráficos de movimentações, categorias, situações e gastos.
4. **Patrimônio e número de série** — os 109 itens entraram sem esses dados (a planilha não trazia); precisam ser preenchidos aos poucos.
5. **Fotos dos equipamentos** — nenhum item tem foto ainda; ficam com imagem vazia no inventário.
6. **Conferir situações** — a planilha gerou 8 situações diferentes (em uso, disponível, aguardando instalação, quebrado, no conserto, na revisão, inativo, extraviado). Se a preferência for só três (disponível, em uso, não funcionando), dá para simplificar.

## Não testado na prática

Os fluxos foram construídos e compilam, mas nenhuma retirada/devolução real passou pelo sistema ainda. Vale fazer um teste de ponta a ponta com um equipamento antes de liberar para a equipe.

## Como prosseguir — ordem sugerida

1. Teste guiado de ponta a ponta (retirar → devolver → conferir) com um item, para validar tudo com dados reais.
2. Central de avisos com sininho e contagem de não lidos.
3. Gráficos no painel.
4. Reservas com bloqueio de conflito.
5. Ajustes finos: simplificar situações se desejado, campos de patrimônio em lote, fotos dos itens.

## Detalhes técnicos

Banco (Lovable Cloud) com RLS ativo em todas as tabelas e papéis em tabela separada (`user_roles`) com funções `has_role`/`is_gestor`. Fotos e documentos em bucket privado com URLs assinadas. QR Code gerado no cliente apontando para `/equipamento/{id}`. `recharts` já está instalado, então os gráficos do painel não exigem nova dependência. As tabelas `reservations` e `notifications` já existem no banco — faltam apenas as telas.
