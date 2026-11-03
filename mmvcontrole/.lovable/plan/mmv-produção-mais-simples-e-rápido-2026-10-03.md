# MMV Produção mais simples e rápido

Objetivo: quem tem pressa pega e devolve um equipamento em poucos toques, e quem tem tempo consegue registrar tudo com calma. Ao mesmo tempo, o controle continua completo.

## 1. Dois modos de uso

**Retirada rápida (pressa, por exemplo minutos antes do culto)**
- Um botão grande no Painel: "Pegar equipamento".
- Ler o QR Code ou tocar no item, escolher a quantidade e confirmar. Uma foto só, sem assinatura.
- A previsão de devolução já vem preenchida com "hoje, fim do evento".

**Retirada completa (com tempo, por exemplo eventos externos)**
- O fluxo de hoje, com finalidade, destino, acessórios, várias fotos e assinatura.

**Devolução rápida:** "Devolver" mostra direto o que está com a pessoa. Ela toca no item, tira uma foto e escolhe "Tudo certo" ou "Tem problema". A análise de danos com IA continua como opção.

## 2. Menos telas e nomes mais claros

O menu lateral tem hoje 17 itens. A proposta é agrupar em 5 abas:

```text
Início       -> Painel com os botões grandes Pegar / Devolver / Ler QR
Equipamentos -> Inventário + Kits + QR Codes
Comigo       -> o que está comigo agora e o meu histórico
Cuidados     -> Limpeza, Manutenção e Assistência juntas (abas internas)
Gestão       -> Pendências, Conferência, Reservas, Relatórios, Usuários, Configurações (só coordenador/admin)
```

Nomes simplificados:
- "Retirar equipamento" passa a ser **Pegar**
- "Devolver equipamento" passa a ser **Devolver**
- "Conferência" passa a ser **Conferir devoluções**
- "Pendências" passa a ser **Precisa de atenção**
- "Movimentações" passa a ser **Histórico**

Situação do equipamento: hoje são 21 situações. Na tela, todas passam a ser mostradas como 4, cada uma com uma cor:
- Verde: **Disponível**
- Azul: **Em uso**
- Amarelo: **Em cuidado** (limpeza, revisão, conferência)
- Vermelho: **Fora de uso** (quebrado, assistência, extraviado)

O detalhe completo continua dentro da página de cada equipamento.

## 3. Visual

- Painel com 3 botões enormes no topo (Pegar, Devolver, Ler QR) e, logo abaixo, "O que está comigo".
- Inventário em blocos por categoria (Lentes, Câmeras, Cabos, Iluminação...), com o número de disponíveis bem grande, por exemplo "6/8".
- Busca sempre no topo, e filtros só por categoria e situação.
- Um ícone por categoria, para reconhecer o item sem ler.

## 4. Novos equipamentos do estúdio

Novas categorias: **Cabos**, **Iluminação**, **Cages e suportes**, **Energia**.

Itens a cadastrar (com quantidade em estoque, como as baterias):
- Cabos HDMI (separados por comprimento, se você quiser)
- Kit de iluminação GVM (cadastrado como Kit, com os painéis, tripés e fontes dentro)
- Cages
- Cabos de energia / extensões

Itens pequenos e baratos, como os cabos, entram como **"consumo controlado"**: só a quantidade é contada, sem foto obrigatória na retirada.

## 5. Facilitar os testes

- Botão "Modo teste" (só para o admin) que marca as retiradas feitas como teste e permite apagar tudo depois com um toque.

## Ordem sugerida

1. Cadastrar os novos equipamentos e categorias (preciso das quantidades).
2. Pegar e Devolver rápidos, e o Painel com os botões grandes.
3. Menu de 5 abas e os nomes novos.
4. As 4 situações com cores e o inventário em blocos por categoria.
5. Modo teste.

## Detalhes técnicos

- Os itens novos são inseridos por migração no padrão multiunidade (`quantidade` e `quantidade_disponivel`). O kit GVM vai em `kits`/`kit_items`.
- Nova coluna `equipment.controle_simples boolean` para dispensar as fotos obrigatórias.
- Retirada rápida reaproveita `checkouts` com `assinatura` nula e `fotos` com 1 item. A aprovação do coordenador continua só onde já é exigida hoje.
- As 4 situações são um mapeamento visual em `constants.ts`. Os status no banco não mudam.
- Menu reorganizado em `AppShell` e rotas agrupadas com abas internas, sem apagar nenhuma rota que já existe.
- Modo teste: coluna `checkouts.teste boolean`, com limpeza feita só pelo admin, por função no servidor.
