# nuArch — Architecture Lab

Portal independente, em português, para praticar decisões de system design com foco no domínio financeiro e em preparação para entrevistas de arquitetura.

**Site:** https://wesleyvieira99.github.io/nuArch/

## O acervo

- **Roteiro do dia: 13 mocks escritos, 130 etapas.** Diálogo entre entrevistador simulado e candidato, bullets em primeira pessoa, desenho progressivo e consulta dos 130 conceitos do draw.io por etapa.

- **Mapa mental navegável do DSNu.drawio:** 16 temas, 130 conceitos, 136 relações conceituais e os 368 recortes únicos do mural. Zoom, pan, tela ampliada, busca, conexões selecionáveis, explicações, trade-offs, alertas técnicos, notas e referências.
- **Navegação reorganizada:** Orientação, Entender, Praticar e Aprofundar; início com trilhas, retomada do último ponto, índice de seções, modo leitura e ajuste de fonte.

- Atlas de estilos, padrões de dados, integração, resiliência, segurança e operação, com diagramas animados e nós inspecionáveis.
- **64 análises de escala, falhas e SLA:** gargalos observáveis, mecanismos físicos, mitigação, limites de escala, dois incidentes por padrão, failover, recuperação, UX e contratos SLI/SLO/RTO/RPO propostos.
- **Fundamentos distribuídos:** seis capítulos, 34 seções técnicas e seis experimentos sobre CAP/consistência, replicação/quorum/sharding, bancos/índices/pooling, caches, balanceamento e filas/backpressure.
- **Cinco entrevistas guiadas de 60 minutos:** chargebacks em lote, transferência com ledger, condições de pagamento, decisão antifraude e migração entre células. 50 etapas com falas autorais em primeira pessoa, desenhos progressivos, contratos/código, interrupções, falhas, critérios Staff/Principal, modo de ensaio e notas por etapa.
- **Videoteca com 50 vídeos públicos do YouTube:** mocks e walkthroughs de problemas de Big Tech, roteiros autorais em português, filtros, player sob demanda, notas e progresso de revisão.
- **Curso LINUXtips em uma página:** 29 aulas/apresentações, 26 artigos, 26 cases, 16 diagramas e inventário dos 341 arquivos do repositório indicado. Slides sob demanda, busca por aula/arquivo, notas, progresso e conexões com o atlas.
- Implementações possíveis em **AWS, Azure e on-premises**, com serviços, responsabilidades e limites de equivalência.
- **1.200 perguntas comentadas:** 60 cenários × 20 perspectivas técnicas, com mecanismos, red flags e aprofundamentos.
- **120 simulados de 60 minutos:** 60 cenários em dois modos, desenho inicial e incidente/evolução. Cronômetro, anotações e autoavaliação.
- Casos publicados pelo Nubank, relatos de candidatos com ressalvas de proveniência e contexto profissional público dos entrevistadores.
- **Ledger bancário em uma aba própria:** cinco seções técnicas, diagrama ASCII e interativo, datoms, partidas dobradas, transactor, infraestrutura AWS/Azure/on-prem, ordering, projeções e compensações. Código Python com Pydantic e testes de concorrência incluído em `examples/ledger`.
- Laboratórios interativos de idempotência, filas, cauda de latência, particionamento e ledger com time-travel, leitura atrasada, replay e estorno.
- Busca global, filtros, comparação de padrões, flashcards, favoritos, progresso local, importação/exportação e temas claro/escuro.

## Critérios editoriais

Nas entrevistas guiadas, apenas chargeback é associado a relatos públicos de candidatos; o ledger é cenário plausível autoral, e os outros três são exercícios adaptados de publicações oficiais. Desenhos, falas, números de treino e rubrica Staff/Principal não são arquitetura interna confirmada, enunciado garantido ou avaliação oficial. A agenda de 60 minutos é pedagógica: combine o tempo real com o entrevistador.

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
node --check models.mjs
node --check mindmap.mjs
node --check playbook.mjs
node --check playbook-routing.mjs
node scripts/test_playbook_routing.mjs
node scripts/test_models.mjs
node scripts/test_progress_merge.mjs
python3 scripts/validate.py
```

Os 50 vídeos da videoteca original foram conferidos em playlists públicas, metadados oEmbed e descrições disponíveis do YouTube. Guias editoriais não são transcrições nem alegam visualização integral. Cargos e empresas nos títulos são apresentados pelos autores; não são entrevistas confidenciais ou arquiteturas oficiais.

O curso foi catalogado a partir da árvore completa do commit `ae638baca549021f793fb9809582d7d876c08bc4` do repositório público indicado. Os 29 slides e endpoints de incorporação estavam acessíveis; 25/26 artigos retornaram HTTP 200. O artigo de API Gateways retornou 404. Outros links incompletos da origem aparecem na página. Guias são autorais; slides e artigos não são republicados. Não há gravações de aulas no repositório.

A validação verifica o mapa (temas, conceitos, relações, fontes, rotas e todos os recortes), contagens, cobertura operacional dos 64 padrões, 50 vídeos únicos, 29 aulas e 341 arquivos únicos do curso, cinco entrevistas guiadas com 50 etapas cronológicas e grafos progressivos, vínculos do acervo, IDs e textos únicos, cronogramas sequenciais de 60 minutos, referências, integridade dos diagramas, três implementações por padrão, existência de ativos e ausência de dados privados conhecidos.

A verificação de UI inclui busca, filtros, expansão de perguntas, favoritos, cronômetro, diagramas, laboratórios e layouts de desktop/celular. Os modelos interativos são didáticos, não benchmarks nem simuladores completos de infraestrutura. Exemplos de código exigem adaptação e revisão antes de qualquer uso produtivo.

O exemplo financeiro é uma referência executável em memória. Ele demonstra isolamento local e validação de invariantes, mas não oferece durabilidade entre reinícios, consenso entre processos, autorização ou liquidação externa. Consulte `examples/ledger/README.md` para execução, testes e limites.

Após editar os arquivos do exemplo, execute `python3 scripts/embed_ledger.py` para atualizar a cópia exibida no portal.

## Exportar um HTML portátil

```sh
python3 scripts/export.py nuArch-portable.html
```

O exportador embute conteúdo, código, CSS, ícones e os 368 recortes do mapa em um único HTML (aproximadamente 65 MB) que pode abrir diretamente no navegador. Não depende de Google Fonts. Links de referência, apresentações Google Slides, miniaturas e players do YouTube continuam externos e exigem conexão. O conteúdo textual, os experimentos e o mapa com suas imagens funcionam offline.

## Roteiro do dia

A página `#playbook` abre em **Passo a passo**: uma sequência linear de dez etapas para cada um dos 13 cenários. Cada etapa começa com uma fala autoral do entrevistador simulado e continua com bullets do candidato: fala, conceito, conexões no desenho, tecnologia/alternativa, defesa da decisão e checkpoint. O desenho progressivo, a explicação longa e o mecanismo ficam junto da etapa, em um detalhe expansível. A navegação também oferece ensaio com cronômetro de 60 minutos, modo de tentativa antes da resposta, anotações locais, revisão por etapa e download do roteiro com as notas.

Os 13 cenários totalizam 130 etapas adaptadas: Pix, chargeback, entrega de cartão, atendimento, antifraude, condições de pagamento, extrato, migração de célula, monitoramento, IDs, KV, entrega de documentos e cache distribuído. Os 130 conceitos do draw.io aparecem nas etapas pertinentes, com tecnologias nomeadas, alternativas, trade-offs e exemplos bancários. Um seletor leva diretamente do conceito ao passo; os mecanismos, limites, fontes e recortes do mapa continuam conectados. Há 42 decisões para escolher peças e 49 interrupções respondidas com alteração do quadro, limite e visão Principal. Os diagramas roteiam setas ao redor de caixas, permitem inspecionar nós/fluxos e removem ligações substituídas durante a evolução.

A atualização de cache distribuído acrescenta seis PDFs (85 páginas), um mock de dez etapas e blocos consultivos nas situações bancárias existentes. O roteiro aborda distribuição, memória, LRU/LFU, TTL, cache-aside, invalidação versionada, stampede, hot keys, failover e proteção da origem. Redis Cluster, Memcached e alternativas são comparados por garantia e operação. As simplificações dos materiais recebem correções com fontes primárias: write-through não garante atomicidade entre stores, LRU é recência, sharding não elimina sozinho SPOF e uma média ponderada de percentis não calcula o percentil agregado. Um filtro permite abrir somente os seis materiais novos.

A atualização de 01/11/2026 mantém os 13 cenários e suas dez etapas. Acrescenta 31 materiais (30 PDFs com 401 páginas e uma nota em Google Docs), 30 consultas por cenário, dez falas de contexto do Nubank e 15 conexões entre vídeos, fontes primárias datadas e aplicação no desenho. A área **Nubank na conversa** liga cada tópico à etapa e ao trecho do vídeo; não apresenta uma síntese externa como inventário interno atual. Filas/pub-sub, rate limiting, contadores, objetos, busca, logs, IA e RESHADED entram nas situações pertinentes. A nota de AI Coding fica identificada como síntese sem bibliografia rastreável, sem substituir o formato confirmado para a etapa.

Foram renderizadas amostras dos 30 PDFs novos, com inspeção de páginas selecionadas; colunas e figuras já cortadas na origem permanecem como limitação. Os seis PDFs de cache com metadados alterados tiveram o texto reextraído e comparado: conteúdo textual idêntico à revisão anterior. Não são republicados originais, transcrições ou imagens do Drive.

O inventário da pasta fornecida contém 77 itens: 71 PDFs, quatro vídeos, um draw.io e um Google Doc. Os textos extraídos dos 71 PDFs foram lidos integralmente. Na atualização de cache, as 85 páginas foram renderizadas para inspeção geral, com ampliação de diagrama selecionado; tabelas já cortadas na origem não foram reconstruídas. Os quatro vídeos somam 1h43min41s e foram analisados por transcrição automática integral do áudio, leitura editorial e amostragem visual; isso não equivale a assistir a cada frame nem a uma legenda oficial. Termos técnicos, unidades e negações foram conferidos quando relevantes. A revisão distingue fonte secundária, publicação primária e relato de candidato. O vídeo “100+ conceitos — parte 1” cobre 20 conceitos.

O draw.io reutiliza a análise anterior do anexo local: a cópia do Drive tem o mesmo nome e tamanho, mas excede o limite de 256 MiB do conector e não foi comparada byte a byte. A limitação aparece no inventário. Não são publicados arquivos originais, transcrições ou frames. Os links do Drive mantêm suas permissões de origem. Dados e fontes editoriais ficam em `data/playbook.json`; `playbook.mjs`, `playbook-routing.mjs` e `playbook.css` implementam a experiência.

As contagens, duração dos roteiros, referências, links internos, 77 itens de cobertura e progressão dos grafos entram na validação. Os testes de geometria percorrem todas as etapas e verificam que setas não atravessam outras caixas. Bullets são apoios de memória para uma conversa adaptativa, não respostas para recitar nem promessa de aprovação.

## Origem do mapa mental

O arquivo fornecido `DSNu.drawio` contém 450 células, 372 ocorrências de imagens embutidas (368 imagens únicas) e quatro ícones externos. Os recortes foram convertidos para WebP e miniaturas; o arquivo original de aproximadamente 275 MiB não é publicado. As imagens carregam sob demanda. OCR auxilia a busca, mas não substitui a leitura do original. Textos, conexões e explicações são curadoria editorial e distinguem simplificações do mural de garantias técnicas. Cada imagem é vinculada a pelo menos um conceito; notas de origem e fontes aparecem na página.

## Dados e privacidade

Todo progresso fica em `localStorage` no navegador. Não há backend, coleta de áudio, tracking próprio de estudo ou envio de anotações. Miniaturas são servidas pelo YouTube; o player é carregado somente por clique e fica sujeito às políticas da plataforma. Apresentações externas do curso também só carregam após clique; o catálogo referencia a autoria original. A exportação cria um JSON local; importe apenas arquivos de progresso conhecidos. Alterações de campos diferentes são mescladas ao salvar para preservar estudo feito em outra aba. Edições do mesmo campo usam a última gravação; `localStorage` não oferece uma transação para gravações simultâneas entre abas. Exporte backups do progresso. Progresso não é sincronizado entre dispositivos automaticamente. Evite registrar dados confidenciais em um computador compartilhado.

## Publicação

GitHub Pages serve a branch `main`, diretório raiz. `.nojekyll` mantém a publicação estática. Não são necessários tokens no frontend, serviços pagos ou banco externo. Não publique arquivos privados neste repositório público.

Pesquisa inicial consolidada em **30 de outubro de 2026**; mapa e organização atualizados em **31 de outubro de 2026**. Links e produtos podem mudar: consulte as páginas oficiais antes de extrapolar uma garantia.

## Identidade visual e movimento

A camada `studio.css` refina as superfícies, a hierarquia, o contraste claro/escuro e a leitura móvel. A marca autoral do nuArch usa nós conectados, também presentes no favicon. O símbolo Nubank mantém o SVG e a cor do cabeçalho oficial, em uma assinatura de preparação independente; a procedência e o checksum estão em `assets/brand/provenance.json` ([sala de imprensa oficial](https://nu.com/pt/sala-de-imprensa)).

`studio.mjs` oferece entradas breves por rota, pausa global de animações, preferência de movimento reduzido e suspensão de fluxos SVG fora de tela. Não anima notas, filtros ou relógios. Os vídeos contextuais da abertura, das 15 conexões do Nubank e dos quatro vídeos do acervo carregam o player somente após um clique, sem autoplay. Fechar o tópico encerra seu player; o link externo permanece disponível. Em arquivos abertos diretamente por `file://`, o YouTube pode recusar a incorporação por ausência de Referer; a versão HTTP e o link externo são as alternativas.

O exportador inclui a camada visual, o módulo de interação e os ativos de marca no HTML portátil. Conferência: celular de 390px, desktop de 1440px, tema escuro, pausa de movimento, player contextual com timestamp, fechamento e restauração de foco, conteúdo e rotas de diagramas.
