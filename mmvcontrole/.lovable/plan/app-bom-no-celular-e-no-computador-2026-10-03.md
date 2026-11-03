# App bom no celular e no computador

Objetivo: o app abre rápido e fica bem arrumado nos dois, tanto no celular (de pé) quanto no computador (tela larga).

## 1. Conferir tela por tela
Abrir cada tela do app em dois tamanhos, celular (390 px) e computador (1280 px), e corrigir o que estiver errado:
- textos cortados ou sobrepostos
- botões pequenos demais para o dedo
- itens que passam da largura da tela
- espaços vazios demais no computador

Telas: Entrar, Início, Inventário, Ficha do equipamento, Pegar, Devolver, Ler QR, Kits, Reservas, Histórico, Avisos, Limpeza, Manutenção, Assistência, Precisa de atenção, Conferir devoluções, Usuários, Relatórios e Configurações.

## 2. Celular
- Barra de baixo fixa, sem cobrir o fim da página e respeitando a área do "risquinho" do iPhone.
- Formulários em uma coluna, com campos e botões grandes.
- O topo de cada tela com o título numa linha só e os botões de ação logo abaixo.

## 3. Computador
- Menu lateral fixo, com rolagem própria.
- Listas em 2 a 3 colunas (Inventário, Kits, Retirar).
- Formulários longos (Pegar, Devolver, Novo equipamento) em 2 colunas, com fotos e assinatura à direita.
- Largura máxima para o conteúdo não ficar esticado demais.

## 4. Abrir mais rápido
- Telas e gráficos carregados só quando forem abertos. Os gráficos do Início e dos Relatórios são os mais pesados.
- Fotos do inventário em miniatura, carregadas só quando aparecem na tela.
- Dados guardados por alguns segundos ao trocar de tela, para não buscar tudo de novo a cada clique.
- Mensagem "Carregando..." trocada por blocos cinza no formato do conteúdo.

## 5. Verificação
Ao final, tirar fotos de cada tela nos dois tamanhos e mostrar a você um resumo do que mudou.

## Detalhes técnicos
- Auditoria com Playwright em 390x844 e 1280x800, com sessão de teste, procurando `scrollWidth > clientWidth`.
- Cabeçalhos com `grid-cols-[minmax(0,1fr)_auto]`, `min-w-0` e `truncate`. Bottom nav com `pb-[env(safe-area-inset-bottom)]`.
- Componentes `recharts` com `React.lazy`. `StorageImage` com `loading="lazy"` e cache das URLs assinadas.
- `staleTime` padrão de 30s no QueryClient. Componente `Skeleton` nas listas.
