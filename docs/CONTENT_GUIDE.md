# Guia de conteúdo e proveniência

Este documento reúne o escopo editorial, a origem dos materiais e os cuidados de manutenção do nuArch. Para compreender o software, consulte [ARCHITECTURE.md](ARCHITECTURE.md); para resultados de verificações, [VALIDATION.md](VALIDATION.md). A apresentação do projeto está no [README](../README.md).

## Índice

- [Processo editorial e assistência de IA](#processo-editorial-e-assistência-de-ia)
- [Mapa do conteúdo](#mapa-do-conteúdo)
- [Roteiro do dia e materiais fornecidos](#roteiro-do-dia-e-materiais-fornecidos)
- [Vídeos e curso externo](#vídeos-e-curso-externo)
- [Origem do mapa mental](#origem-do-mapa-mental)
- [Experimentos e exemplo financeiro](#experimentos-e-exemplo-financeiro)
- [Dados locais, privacidade e serviços externos](#dados-locais-privacidade-e-serviços-externos)
- [Identidade visual e movimento](#identidade-visual-e-movimento)
- [Manutenção e publicação](#manutenção-e-publicação)

## Processo editorial e assistência de IA

O projeto foi desenvolvido com assistência de IA para pesquisa, síntese, produção de conteúdo, implementação e revisões. Isso inclui agentes trabalhando em partes distintas e revisões técnicas entre essas partes. Esse processo não equivale a revisão humana integral, auditoria externa ou validação oficial das empresas mencionadas.

As explicações, perguntas, falas de treino, desenhos e metas propostas são conteúdo autoral produzido nesse processo. A rastreabilidade permite verificar afirmações e corrigir o material; quantidade de itens ou presença de uma referência não prova, isoladamente, correção.

O conteúdo distingue quatro tipos de evidência:

| Tipo                                 | Como interpretar                                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Documentação primária**            | Sustenta uma propriedade técnica dentro do produto, versão e configuração descritos. Não transfere automaticamente a garantia ao sistema inteiro. |
| **Publicação oficial de engenharia** | Registra um caso e seu contexto na data da publicação. Não é inventário completo ou necessariamente atual da empresa.                             |
| **Relato público de candidato**      | Evidência contextual de uma experiência individual, sem confirmação independente de recorrência ou critérios internos.                            |
| **Exercício e inferência editorial** | Proposta para praticar decisões. Topologia, números, falas e rubrica não são fatos internos nem enunciados garantidos.                            |

As perguntas e os simulados não foram obtidos dos entrevistadores. Fontes profissionais públicas oferecem contexto parcial; o acesso direto ao LinkedIn falhou na pesquisa registrada, e não se alega revisão completa de carreira ou posts. Não se deduz comportamento individual a partir de cargo ou experiência.

Escalas, latências e SLI/SLO/RTO/RPO propostos pertencem ao exercício, salvo quando um fato público estiver explicitamente atribuído e datado. O catálogo seleciona famílias de padrões; não pretende enumerar todas as arquiteturas ou tecnologias existentes. A agenda de 60 minutos é pedagógica e deve ser adaptada à conversa real.

## Mapa do conteúdo

Contagens conferidas nos arquivos JSON em **01/11/2026**. São inventário do escopo, não indicadores de qualidade. Alterações futuras devem atualizar dados, validações e documentação em conjunto.

| Conteúdo                       | Escopo registrado                                                                                                   | Fonte local principal                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Atlas                          | 64 padrões; análise operacional em todos; três alternativas de implantação por padrão; 26 tecnologias de referência | [architectures.json](../data/architectures.json)                            |
| Fundamentos                    | Seis capítulos e 34 seções sobre consistência, replicação, bancos, caches, balanceamento e filas                    | [foundations.json](../data/foundations.json)                                |
| Roteiro do dia                 | 13 casos, 130 etapas, 42 decisões e 49 interrupções; conexão com 130 conceitos                                      | [playbook.json](../data/playbook.json)                                      |
| Entrevistas guiadas            | Cinco casos aprofundados, 50 etapas cronológicas                                                                    | [guided.json](../data/guided.json)                                          |
| Prática                        | 60 cenários ×20 perspectivas: 1.200 perguntas; 120 simulados em dois modos                                          | [practice.json](../data/practice.json)                                      |
| Mapa mental                    | 16 temas, 130 conceitos, 136 relações e 368 recortes únicos                                                         | [mindmap.json](../data/mindmap.json)                                        |
| Videoteca                      | 50 vídeos públicos, com guias de estudo e ligações ao atlas                                                         | [videos.json](../data/videos.json)                                          |
| Curso LINUXtips                | 29 aulas/apresentações, 26 artigos, 26 cases, 16 diagramas e inventário de 341 arquivos                             | [course-linux.json](../data/course-linux.json)                              |
| Ledger                         | Cinco seções técnicas, diagramas e código executável em memória                                                     | [ledger.json](../data/ledger.json), [exemplo](../examples/ledger/README.md) |
| Pesquisa e referências visuais | Casos públicos, relatos, contexto profissional e procedência dos ícones                                             | [research.json](../data/research.json), [logos.json](../data/logos.json)    |

O atlas aborda mecanismos e falhas, além de apresentar diagramas. As fichas operacionais identificam gargalos observáveis, mitigação, limites de escala, incidentes, recuperação e impacto na jornada. AWS, Azure e infraestrutura própria são alternativas condicionadas à garantia necessária; serviços com aparência semelhante não são tratados como equivalentes em todos os aspectos.

As cinco entrevistas guiadas aprofundam chargeback em lote, transferência com ledger, condições de pagamento, antifraude e migração entre células. Nesse conjunto, chargeback é associado a relatos públicos, ledger é cenário plausível e os outros três são adaptações de publicações oficiais. Falas, desenhos, hipóteses e critérios Staff/Principal continuam sendo exercícios.

## Roteiro do dia e materiais fornecidos

A página `#playbook` começa por uma sequência linear de dez etapas: alinhamento, invariantes, dimensionamento, contratos, caminho mínimo, integração assíncrona, escala, falhas, operação e fechamento. Cada etapa combina entrevistador simulado, fala do candidato e bullets sobre conceito, conexões, tecnologia, alternativa e defesa da decisão. Desenho progressivo e explicação longa ficam disponíveis para aprofundamento.

Os cenários são Pix, chargeback, entrega de cartão, atendimento, antifraude, condições de pagamento, extrato, migração de célula, monitoramento, geração de IDs, KV, documentos privados e cache distribuído. O modo de ensaio oferece cronômetro, tentativa antes da resposta, notas por etapa e exportação do roteiro. Os bullets apoiam uma conversa adaptativa; não são falas para recitar.

Os conceitos do mapa são associados às etapas pertinentes, com tecnologias, alternativas e exemplos bancários. As decisões ajudam a escolher peças; as interrupções exigem atualizar o quadro e explicitar limites. Os diagramas removem ligações substituídas e roteiam arestas ao redor das caixas.

### Cobertura e método de leitura

O inventário da pasta fornecida registra **77 itens: 71 PDFs, quatro vídeos, um draw.io e um Google Doc**. Os textos extraídos dos 71 PDFs foram lidos integralmente. Isso não significa inspeção visual integral de todas as páginas, revisão externa ou confirmação de todas as afirmações dos materiais.

- **Cache distribuído:** seis PDFs, 85 páginas. Houve renderização para inspeção geral por folhas de contato e ampliação de diagrama selecionado. Algumas tabelas já tinham colunas cortadas na origem; elas não foram reconstruídas. Após mudança de metadados, os textos foram extraídos novamente e comparados, sem alteração textual.
- **Atualização de 01/11/2026:** 30 PDFs novos, com 401 páginas, e uma nota em Google Docs. Foram renderizadas amostras dos PDFs e inspecionadas páginas selecionadas. Figuras e colunas ausentes continuam sinalizadas como limitação.
- **Nota de AI Coding:** revisada como síntese sem bibliografia rastreável; não confirma uma mudança do formato da entrevista nem substitui o material oficial fornecido.
- **Quatro vídeos fornecidos:** duração conjunta de 1h43min41s. A revisão usou transcrição automática integral do áudio, leitura editorial e amostragem visual; não equivale a assistir a cada frame ou usar legenda oficial. Termos, unidades e negações relevantes foram confrontados com outras evidências. O vídeo “100+ conceitos — parte 1” cobre 20 conceitos.
- **Draw.io no Drive:** tem mesmo nome e tamanho do anexo local analisado, mas excede o limite de 256 MiB do conector. Não foi feita comparação byte a byte, portanto identidade de conteúdo não é presumida.

A atualização de novembro acrescentou 30 notas distribuídas entre os cenários, dez falas de contexto e 15 ligações entre vídeos, publicações primárias datadas e decisões do desenho. A área “Nubank na conversa” distingue síntese externa, fato histórico e proposta do exercício; não apresenta os vídeos como catálogo interno atual do banco.

As correções técnicas incluem limites de atomicidade entre sistemas, expiração e invalidação de cache, atraso de índices, privacidade de objetos e logs, orçamento de misses e distinção entre média e percentis. O material original é tratado criticamente, não como instrução ou autoridade técnica automática. Cada correção deve manter a fonte que sustenta sua interpretação.

**Não são republicados os PDFs, a captura do convite, email, link de reunião, transcrições ou frames dos vídeos fornecidos.** O portal apresenta sínteses e links com as permissões de origem. Os recortes do anexo local draw.io constituem o acervo visual descrito em seção própria abaixo.

## Vídeos e curso externo

### Videoteca pública

Os 50 vídeos da videoteca foram conferidos em playlists públicas, metadados oEmbed e descrições disponíveis do YouTube. Os guias em português são sugestões editoriais de estudo com base nesses metadados; não são transcrições e não alegam visualização integral. Cargos e empresas nos títulos são apresentados pelos autores dos vídeos, não certificação deste projeto.

Esse método é diferente da transcrição integral dos quatro vídeos fornecidos no acervo. Ao acrescentar um vídeo, registre qual evidência foi efetivamente consultada e evite atribuir ao conteúdo algo inferido apenas do título.

### Curso LINUXtips

O catálogo corresponde à árvore completa do commit `ae638baca549021f793fb9809582d7d876c08bc4` do repositório registrado em [course-linux.json](../data/course-linux.json). Foram inventariados seus 341 arquivos e os links Markdown dos 39 arquivos `.md`. Guias são autorais e baseados no índice e na estrutura dos exemplos; não representam revisão integral de cada slide.

Na checagem de **30/10/2026**, os 29 links Google Slides e seus endpoints de incorporação responderam com interface pública. Dos 26 artigos, 25 retornaram HTTP 200; o artigo de API Gateways retornou 404 e está sinalizado. Links vazios e destinos relativos ausentes também constam do inventário. Disponibilidade observada nessa data não garante acesso futuro.

Não há gravações de aulas no repositório catalogado. Slides, artigos e exemplos são referenciados, não republicados pelo catálogo. A informação de licença do repositório era `null` no snapshot consultado; isso não é interpretado como licença livre.

## Origem do mapa mental

O `DSNu.drawio` fornecido localmente contém 450 células: 372 ocorrências de imagens embutidas, que correspondem a 368 imagens únicas, além de quatro ícones externos. O arquivo original, de aproximadamente 275 MiB, não integra o repositório publicado.

Os recortes foram organizados em WebP e miniaturas, com carregamento sob demanda. Cada imagem está associada a pelo menos um conceito. OCR auxilia a busca; pode errar e não substitui a inspeção da imagem. Textos, relações, mecanismos, trade-offs e alertas são curadoria adicional, distinguindo a simplificação visual de uma garantia técnica.

A experiência permite zoom, pan, busca, seleção de conexões, tela ampliada, notas e navegação por tema. A geometria do mural foi reorganizada para navegação; os recortes preservam a referência de origem. Evite apagar vínculos de origem ao reorganizar conceitos.

## Experimentos e exemplo financeiro

Os laboratórios permitem explorar consequências de idempotência, vazão e backlog, cauda de latência, particionamento e saldo/projeção. São modelos com premissas explícitas, não benchmarks de produtos, previsões de desempenho ou simuladores completos de infraestrutura. Os cálculos puros de quorum, fila, cache, pool e token bucket ficam em [simulation-models.mjs](../src/domain/simulation-models.mjs). Outros laboratórios ainda têm lógica integrada à apresentação em [app.js](../src/app.js).

O ledger em [examples/ledger](../examples/ledger/README.md) usa Python e Pydantic. Demonstra postings balanceados, identidade de intenção, concorrência local, histórico e estorno. Não tem durabilidade entre reinícios, consenso entre processos, autorização de clientes ou liquidação externa; também não é uma implementação do Datomic. O README do exemplo é a referência para sua convenção de sinais, API, custos e testes.

Ao alterar o exemplo, execute seus testes e depois `python3 scripts/embed_ledger.py` para sincronizar a cópia exibida no portal. Não mantenha código explicativo divergente do exemplo testado.

## Dados locais, privacidade e serviços externos

Notas, favoritos e progresso são armazenados em `localStorage` no navegador. Não há backend de estudo, coleta de áudio ou envio próprio de anotações. A exportação de progresso gera um JSON local; importe apenas arquivos conhecidos e mantenha backups quando o registro for importante.

A mesclagem preserva alterações de campos diferentes feitas em outra aba. Para o mesmo campo, prevalece a última gravação; `localStorage` não fornece uma transação entre abas concorrentes. Não há sincronização automática entre dispositivos, e a limpeza dos dados do navegador pode apagar o progresso. Evite registrar informações confidenciais, especialmente em computador compartilhado.

Miniaturas e players do YouTube são serviços externos; o player só é carregado por ação do usuário e segue as políticas do provedor. Slides externos também carregam sob demanda. A versão hospedada pode requisitar fontes Google Fonts, com fallback local. Portanto, “sem backend próprio” não significa ausência de requisições a terceiros.

O HTML portátil incorpora conteúdo, código, estilos, ícones e recortes do mapa, dispensando Google Fonts. Referências externas, miniaturas, vídeos e apresentações ainda exigem conexão. Em `file://`, o YouTube pode recusar incorporação por ausência de Referer; o link externo ou servir o arquivo por HTTP são alternativas. Conteúdo textual, experimentos e imagens incorporadas permanecem disponíveis offline.

## Identidade visual e movimento

A identidade própria do nuArch usa nós conectados, inclusive no favicon. O símbolo Nubank é apresentado em contexto de preparação independente, preservando o SVG e a cor da fonte oficial. Procedência e checksum estão em [assets/brand/provenance.json](../assets/brand/provenance.json). Os demais logos e ícones têm origem e limitações em [data/logos.json](../data/logos.json).

Procedência oficial não equivale a licença aberta ou autorização de endosso. Marcas pertencem a seus titulares; o portal não é afiliado, patrocinado ou aprovado pelo Nubank ou pelos fornecedores. Não adicionar uma licença ao conjunto de ativos por inferência.

[studio.mjs](../src/ui/studio.mjs) e [studio.css](../styles/studio.css) concentram o refinamento visual e controles de movimento. As entradas por rota são breves, há pausa global, suporte à preferência de movimento reduzido e suspensão de animações SVG fora da tela. Notas, filtros e relógios não devem animar a cada atualização.

Vídeos contextuais carregam sob demanda, sem autoplay. Fechar um tópico encerra seu player; o link externo continua disponível. Alterações nesse comportamento devem preservar navegação por teclado, restauração de foco, legibilidade móvel e os controles de movimento.

## Manutenção e publicação

Antes de alterar conteúdo:

1. Identifique o arquivo em `data/`, o ID estável e as rotas que o referenciam.
2. Registre a fonte primária, data e escopo da afirmação. Separe evidência de proposta autoral.
3. Mantenha vínculos de origem, tecnologias, etapas e imagens; uma troca de ID pode quebrar navegação e progresso salvo.
4. Para diagramas progressivos, confira o início e o fim da visibilidade de nós e arestas, além da geometria de todas as etapas.
5. Execute `npm run check` e `npm run format:check`. Se houver mudança no ledger, instale suas dependências e execute também `npm run test:ledger`.
6. Revise a interface afetada e atualize a documentação de validação com o que foi efetivamente observado.

A validação de conteúdo verifica referências e rotas, contagens, cronogramas, grafos, cobertura dos materiais e existência de ativos. Testes geométricos verificam que segmentos não atravessem caixas de outros nós. Isso complementa, sem substituir, revisão técnica das explicações e inspeção da interface. O escopo executado e seus resultados devem constar em [VALIDATION.md](VALIDATION.md).

O projeto é servido estaticamente pelo GitHub Pages. `.nojekyll` preserva a entrega dos arquivos; não há tokens no frontend ou serviço pago obrigatório. O comando `npm run export` gera `dist/nuArch.html`. Consulte a documentação de arquitetura para o mecanismo de publicação atual, sem presumir que executar localmente publique o projeto.

Não inclua no repositório arquivos privados, transcrições brutas, credenciais ou convites de entrevista. Ao incorporar uma fonte nova, revise também exemplos, metadados e imagens em busca de conteúdo que não pertença ao acervo público.

A pesquisa inicial foi consolidada em **30/10/2026**; mapa e organização receberam atualização em **31/10/2026**, e o acervo foi ampliado em **01/11/2026**. Links, configurações e produtos mudam. Revalide a documentação oficial antes de extrapolar uma garantia para outra versão ou implantação.
