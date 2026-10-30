# nuArch — Architecture Lab

Portal independente, em português, para praticar decisões de system design com foco no domínio financeiro e em preparação para entrevistas de arquitetura.

**Site:** https://wesleyvieira99.github.io/nuArch/

## O acervo

- Atlas de estilos, padrões de dados, integração, resiliência, segurança e operação, com diagramas animados e nós inspecionáveis.
- Implementações possíveis em **AWS, Azure e on-premises**, com serviços, responsabilidades e limites de equivalência.
- **1.200 perguntas comentadas:** 60 cenários × 20 perspectivas técnicas, com mecanismos, red flags e aprofundamentos.
- **120 simulados de 60 minutos:** 60 cenários em dois modos, desenho inicial e incidente/evolução. Cronômetro, anotações e autoavaliação.
- Casos publicados pelo Nubank, relatos de candidatos com ressalvas de proveniência e contexto profissional público dos entrevistadores.
- **Ledger bancário em uma aba própria:** cinco seções técnicas, diagrama ASCII e interativo, datoms, partidas dobradas, transactor, infraestrutura AWS/Azure/on-prem, ordering, projeções e compensações. Código Python com Pydantic e testes de concorrência incluído em `examples/ledger`.
- Laboratórios interativos de idempotência, filas, cauda de latência, particionamento e ledger com time-travel, leitura atrasada, replay e estorno.
- Busca global, filtros, comparação de padrões, flashcards, favoritos, progresso local, importação/exportação e temas claro/escuro.

## Critérios editoriais

As perguntas e os simulados são **autorais**, não enunciados obtidos dos entrevistadores. Escalas e metas de exercícios são hipóteses, não métricas do Nubank. Não há uma taxonomia finita de todas as arquiteturas e tecnologias; o catálogo oferece cobertura ampla e selecionada, não universalidade nem promessa de aprovação.

Fontes oficiais, publicações históricas e relatos anônimos recebem rótulos diferentes. Histórico público de LinkedIn é parcial. Experiência profissional serve como contexto, não como previsão de perguntas ou de comportamento individual. Os materiais fornecidos orientaram a preparação; PDFs originais, screenshot, email e link da reunião não são publicados.

Logos e ícones são obtidos de fontes oficiais e usados para identificação educacional. Procedência e limitações constam de `data/logos.json` e da biblioteca. Os direitos de cada marca pertencem aos titulares. O portal não é afiliado ou endossado pelo Nubank ou pelos fornecedores.

## Rodar localmente

Requer Python 3.10+ para o servidor local, sem instalação de dependências:

```sh
python3 -m http.server 8080
```

Abra `http://localhost:8080`. Os dados são carregados por `fetch`, por isso a abertura via `file://` não é suportada. Fontes tipográficas usam Google Fonts, com fallback local. O conteúdo, ícones e lógica do portal ficam no próprio repositório.

## Validar

```sh
node --check app.js
python3 scripts/validate.py
```

A validação verifica contagens, IDs e textos únicos, cronogramas sequenciais de 60 minutos, referências, integridade dos diagramas, três implementações por padrão, existência de ativos e ausência de dados privados conhecidos.

A verificação de UI inclui busca, filtros, expansão de perguntas, favoritos, cronômetro, diagramas, laboratórios e layouts de desktop/celular. Os modelos interativos são didáticos, não benchmarks nem simuladores completos de infraestrutura. Exemplos de código exigem adaptação e revisão antes de qualquer uso produtivo.

O exemplo financeiro é uma referência executável em memória. Ele demonstra isolamento local e validação de invariantes, mas não oferece durabilidade entre reinícios, consenso entre processos, autorização ou liquidação externa. Consulte `examples/ledger/README.md` para execução, testes e limites.

Após editar os arquivos do exemplo, execute `python3 scripts/embed_ledger.py` para atualizar a cópia exibida no portal.

## Exportar um HTML portátil

```sh
python3 scripts/export.py nuArch-portable.html
```

O exportador embute conteúdo, código, CSS e ícones em um único HTML que pode abrir diretamente no navegador. Não depende de Google Fonts. Links de referência continuam externos.

## Dados e privacidade

Todo progresso fica em `localStorage` no navegador. Não há backend, coleta de áudio, tracking de estudo ou envio de anotações. A exportação cria um JSON local; importe apenas arquivos de progresso conhecidos. Progresso não é sincronizado entre dispositivos automaticamente. Evite registrar dados confidenciais em um computador compartilhado.

## Publicação

GitHub Pages serve a branch `main`, diretório raiz. `.nojekyll` mantém a publicação estática. Não são necessários tokens no frontend, serviços pagos ou banco externo. Não publique arquivos privados neste repositório público.

Pesquisa consolidada em **30 de outubro de 2026**. Links e produtos podem mudar: consulte as páginas oficiais antes de extrapolar uma garantia.
