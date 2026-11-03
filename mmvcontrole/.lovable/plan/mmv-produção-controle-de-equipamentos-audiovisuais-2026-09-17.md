# MMV PRODUÇÃO — Controle de Equipamentos Audiovisuais

Aplicativo web responsivo com aparência de app mobile para a equipe de Produção e Comunicação Audiovisual do Ministério Mudança de Vida (unidade Taquari — Mooca, São Paulo/SP).

Como o projeto é grande, ele será entregue em etapas. A Etapa 1 fecha o fluxo principal completo e funcional:

```text
CADASTRO -> QR CODE -> RETIRADA -> RESPONSABILIDADE -> DEVOLUÇÃO -> CONFERÊNCIA -> DISPONÍVEL ou MANUTENÇÃO
```

## Identidade visual

- Azul-escuro como cor principal, azul-claro para informações, verde (disponível/concluído), amarelo (atenção/limpeza/revisão), vermelho (danificado/atrasado), fundo cinza-claro.
- Cards grandes, botões visíveis, ícones simples, tudo em português do Brasil.
- Layout mobile-first com menu inferior no celular e menu lateral em tablet/computador.

## Etapa 1 — Base, acesso e fluxo principal

1. Ativar o banco de dados e o armazenamento de fotos (Lovable Cloud).
2. Tela de login com e-mail e senha, recuperação de senha, nome do ministério e da unidade, e troca obrigatória de senha no primeiro acesso.
3. Perfis e permissões: Administrador Geral, Coordenador de Produção, Operador/Membro, Técnico de Manutenção.
4. Dashboard com os cards de contagem por status, seção "Atenção necessária" e "Movimentações recentes" (gráficos entram na Etapa 3).
5. Inventário: lista com busca (nome, patrimônio, número de série, código), filtros por categoria/status/local e as 25 categorias iniciais.
6. Cadastro/edição de equipamento com todos os campos previstos, foto principal, fotos adicionais, documentos e acessórios.
7. Ficha do equipamento: status, local, responsável atual, acessórios, documentos e linha do tempo de movimentações.
8. QR Code por equipamento: geração, visualização, download em PNG, etiqueta individual e impressão em folha A4.
9. Leitura de QR Code pela câmera do celular, abrindo a ficha resumida com os botões Retirar, Devolver, Informar problema e Enviar para limpeza/revisão.
10. Fluxo de retirada com responsável, finalidade, evento, destino, previsão de devolução, conferência de acessórios, fotos obrigatórias, termo de responsabilidade, assinatura digital e autorização quando exigida. Bloqueio de retirada para equipamento quebrado, em manutenção, na assistência, inativo ou já retirado.
11. Fluxo de devolução com dados da saída, fotos atuais obrigatórias, conferência de acessórios, condição da devolução, relato de problemas e assinatura.
12. Conferência em duas etapas: devolução fica "Aguardando conferência" e só o coordenador/administrador libera para "Disponível" ou encaminha para limpeza, revisão, manutenção ou assistência.
13. Pendências: lista única de atrasos, avarias, itens faltantes e solicitações aguardando autorização.
14. Auditoria: todo registro guarda usuário, data e hora; nada é apagado, apenas inativado ou baixado.
15. Dados de demonstração conforme solicitado (3 câmeras, 3 lentes, 2 tripés, 2 microfones, 1 mesa de corte, 1 notebook, 4 cabos, 4 baterias, 2 carregadores, 2 kits, usuários de cada perfil e exemplos de movimentação).

## Etapa 2 — Manutenção, assistência e limpeza

- Ordens de manutenção com prioridades, diagnóstico, peças, custos e status.
- Assistência técnica com empresa, protocolo, orçamento, aprovação, previsão e retorno de retorno; alerta na dashboard quando o prazo vence.
- Fila de limpeza com fotos antes/depois e aprovação do coordenador.
- Kits: montagem, retirada e devolução do kit com conferência item por item.
- Notificações dentro do sistema.

## Etapa 3 — Gestão e relatórios

- Reservas com bloqueio de conflito de horário.
- Gráficos da dashboard (movimentações, categorias, status, manutenções, gastos).
- Relatórios com todos os filtros e exportação em PDF, Excel e CSV.
- Usuários, unidades, setores, locais e configurações de categorias/permissões.

## Detalhes técnicos

- TanStack Start + React + Tailwind (tokens semânticos no design system), estado de dados via TanStack Query.
- Banco no Lovable Cloud com as tabelas: profiles, user_roles, units, departments, locations, equipment_categories, equipment, equipment_photos, equipment_documents, equipment_accessories, kits, kit_items, reservations, checkouts, checkout_items, returns, return_items, inspections, maintenance_orders, maintenance_expenses, technical_assistance, cleaning_orders, notifications, audit_logs.
- Papéis em tabela separada (user_roles) com função de verificação no banco, evitando escalonamento de privilégio.
- RLS em todas as tabelas: leitura restrita às unidades autorizadas, operadores não editam movimentações finalizadas, exclusão/baixa apenas para administradores, histórico imutável, gatilhos de auditoria.
- Fotos e documentos em bucket de storage com políticas por perfil.
- QR Code gerado no cliente apontando para /equipamento/{código}; leitura via câmera com fallback de busca manual.
- Códigos internos e números de ordem gerados por sequência no banco.
- Dados de demonstração inseridos por migração (schema + INSERT), não em tempo de execução.
