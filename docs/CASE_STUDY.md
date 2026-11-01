# nuArch: um acervo técnico convertido em ferramenta de estudo

O nuArch organiza materiais de system design em uma aplicação navegável, com explicações, fontes,
experimentos e roteiros de conversa. O problema de produto foi transformar um acervo extenso e heterogêneo
em uma sequência utilizável: localizar um conceito, entender sua garantia, compará-lo com alternativas e
explicar uma decisão em um cenário concreto.

Este documento apresenta o projeto como um caso de engenharia de software e curadoria técnica. A aplicação
é independente; não é uma solução solicitada pelo Nubank, um produto financeiro em produção ou um gabarito
de seleção. Seu valor para revisão está nas decisões observáveis e em seus limites, não na quantidade de
tecnologias mencionadas pelo acervo.

[Abrir o portal](https://wesleyvieira99.github.io/nuArch/) · [Arquitetura da implementação](ARCHITECTURE.md) ·
[Execução e validação](../README.md)

## Leitura sugerida para recrutamento e engenharia

Os tempos abaixo são sugestões de navegação, não medições de usabilidade.

| Tempo disponível | Caminho                                                                                                                                                                                                                                                                       | O que observar                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **5 minutos**    | Ler o problema e as decisões desta página; abrir a [visão geral](https://wesleyvieira99.github.io/nuArch/#home) e uma etapa do [roteiro](https://wesleyvieira99.github.io/nuArch/#playbook/pix)                                                                               | Clareza de propósito, uma experiência completa e distinção entre proposta e evidência                      |
| **15 minutos**   | Seguir o caminho anterior; conectar a etapa a um conceito no [mapa](https://wesleyvieira99.github.io/nuArch/#map); ler as fronteiras em [ARCHITECTURE.md](ARCHITECTURE.md)                                                                                                    | Navegação entre conceitos, fontes, estado local e trade-offs de implementação                              |
| **30 minutos**   | Ler o [store de progresso](../src/core/progress-store.mjs), a [geometria dos diagramas](../src/features/playbook/diagram-routing.mjs) e suas suites em [tests](../tests/); executar as verificações do README; consultar os [limites do ledger](../examples/ledger/README.md) | Contratos executáveis, tratamento de falhas, manutenção e diferença entre demonstração e sistema produtivo |

Não é necessário consumir o acervo inteiro para avaliar o projeto. Uma decisão acompanhada de sua fonte,
implementação e teste oferece uma amostra mais útil que uma lista de funcionalidades.

## Contexto e restrições

O material de partida reunia PDFs fornecidos, artigos públicos, vídeos, documentação de produtos e um mural
draw.io com muitas imagens. Os materiais tinham níveis diferentes de autoridade, atualização e precisão.
Uma explicação informal sobre cache, por exemplo, não deveria se transformar automaticamente em uma garantia
de consistência usada no desenho de uma operação financeira.

A experiência também precisava funcionar por link público, sem cadastro, e permitir estudo com notas locais.
O usuário deveria conseguir compartilhar uma rota específica, retomar o ponto anterior e levar uma cópia
do conteúdo para consulta offline. Essas restrições favoreceram uma aplicação estática e impuseram limites
explícitos à persistência e às integrações externas.

## Solução construída

O conteúdo foi separado da interface em catálogos JSON. Os objetos mantêm IDs, referências e relações que
permitem navegar entre atlas, mapa, fundamentos, perguntas, vídeos e exercícios. A página de roteiro organiza
13 cenários em dez etapas cada, com fala simulada, perguntas de esclarecimento, desenho progressivo e condições
para mudar uma decisão. O atlas reúne 64 padrões; o mapa conecta 130 conceitos e seus materiais de origem.
Essas contagens descrevem cobertura editorial, não qualidade comprovada ou domínio de todos os assuntos.

Os diagramas são dados inspecionáveis: cada peça tem responsabilidade e cada ligação tem contrato. Etapas
podem introduzir componentes e retirar relações substituídas. Isso evita que a evolução do desenho acumule
um caminho síncrono antigo ao lado de uma fila nova sem explicar qual deles é válido.

Os laboratórios tornam algumas relações quantitativas manipuláveis. Um exemplo calcula interseção de quorums;
outro acompanha entrada, processamento, fila e rejeição. Cada modelo é limitado às hipóteses declaradas:
interseção matemática não prova linearizabilidade, e uma fila calculada por taxas constantes não representa
a distribuição de latência de um broker real.

## Decisões e alternativas

### Manter o produto estático

A consulta ao conteúdo não exige identidade remota nem coordenação entre usuários. GitHub Pages, módulos ES
e JSON atendem esse uso sem introduzir uma API, credenciais no frontend ou operação de banco. Isso reduz
dependências de execução e permite inspecionar os dados junto do código.

O custo é concentrar carregamento e processamento no navegador. O acervo é buscado integralmente no início,
e o progresso fica restrito ao dispositivo e à origem. Um crescimento relevante de payload, uso em dispositivos
limitados ou necessidade real de colaboração justificaria medir e rever essa decisão. Não foi criado um backend
apenas para demonstrar tecnologias estudadas.

### Tornar a evidência parte do modelo

Fontes oficiais, relatos públicos e exercícios autorais recebem identificação distinta. Publicações históricas
conservam seus limites; uma descrição de sistema em um vídeo não é tratada como inventário interno atual.
O conteúdo relaciona cada afirmação à origem disponível e registra correções quando uma simplificação altera
a garantia técnica.

Essa escolha exige manutenção editorial além de desenvolvimento. Verificar que um `sourceId` existe é
automatizável; determinar se a fonte sustenta uma afirmação exige leitura e julgamento. O projeto mantém as
duas atividades separadas e não usa a existência de um link como prova suficiente.

### Preservar progresso sem simular um serviço de sincronização

Um snapshot antigo de uma aba poderia apagar trabalho feito em outra. O store aplica somente o delta local
sobre o valor mais recente: uma marcação não substitui notas independentes. Testes cobrem adições, remoções,
conflitos por chave, importação e erros de armazenamento.

O mecanismo não torna `localStorage` transacional. Saves simultâneos podem competir; não há sincronização
entre dispositivos. O módulo permite injetar um lock, mas a aplicação usa o caminho síncrono. A importação de
backup substitui o progresso de forma intencional. Esses limites aparecem na documentação, em vez de serem
encobertos por uma promessa genérica de “sincronização”.

### Separar conteúdo extenso de interação complexa

Mapa e roteiro têm módulos com montagem, associação de eventos e desmontagem. Modelos numéricos e merge de
progresso são funções testáveis sem DOM. A interface usa APIs nativas para SVG, dialogs, observers e eventos,
com controle explícito de foco e cancelamento de listeners.

A alternativa de um framework de componentes poderia facilitar a decomposição de renderizadores e a gestão
de estado. A escolha atual mantém poucas dependências, mas exige disciplina na manipulação de templates e
no ciclo de vida. `src/app.js` ainda concentra páginas e composição; a organização em diretórios não elimina
essa dívida técnica.

### Oferecer portabilidade com custo visível

O exportador incorpora conteúdo, código, estilos e imagens em um HTML. Isso permite transportar a experiência
sem instalar um servidor local. A cópia do portal e o backup pessoal de progresso são artefatos diferentes.

O custo é um arquivo grande e um processo de exportação que precisa acompanhar os contratos de módulos e assets.
O exportador percorre dependências locais, evita incorporar o mesmo módulo duas vezes e rejeita ciclos;
suporta apenas o subconjunto de ESM usado no projeto. Vídeos, slides e referências externas não passam a
funcionar offline. Embeds também podem ser recusados pelo
provedor quando abertos por `file://`; o link original permanece uma alternativa.

## Problemas concretos que orientaram a implementação

| Problema                                                  | Resposta implementada                                                                          | Limite que permanece                                                                            |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Conteúdo de origem disperso e com simplificações técnicas | Catálogos, vínculos por ID, fontes, notas de correção e separação de evidência                 | A validação estrutural não substitui revisão técnica de cada afirmação                          |
| Muitas imagens em um mural pouco navegável                | Extração de imagens únicas, WebP, miniaturas, OCR para busca e associação a conceitos          | OCR pode errar; o recorte original continua sendo necessário para inspeção                      |
| Setas atravessando outras peças do diagrama               | Roteamento por geometria e obstáculos, com testes para as etapas publicadas                    | Grafos arbitrários e densidade extrema não têm legibilidade garantida                           |
| Uma aba antiga sobrescrevendo progresso independente      | Merge de delta com baseline e verificação do retorno de persistência                           | Gravações realmente simultâneas não são serializadas pela aplicação                             |
| Conteúdo longo competindo com o desenho e o ensaio        | Roteiro linear, detalhes expansíveis, modo de tentativa, consulta por conceito e notas         | Quantidade de material pode exigir curadoria adicional por objetivo                             |
| Movimento e mídia interrompendo a leitura                 | Pausa, preferência de movimento reduzido, players por clique e fechamento de player contextual | Não constitui certificação de acessibilidade nem controle sobre a interface do provedor externo |

Esses exemplos mostram onde a solução precisou de contratos ou comportamento específico. Não são apresentados
como ganhos de performance, redução de incidentes de produção ou melhoria de aprovação em entrevistas, pois
essas métricas não foram medidas.

## Como verificar a entrega

As verificações disponíveis têm escopos diferentes:

- **Dados e publicação:** o validador Python verifica IDs, referências, cronogramas, integridade de grafos,
  vínculos do acervo, arquivos locais e padrões conhecidos de dados que não devem ser publicados.
- **Comportamento:** suites JavaScript verificam invariantes dos modelos, merge e falhas do store, além da
  geometria das conexões nas etapas dos cenários e parsing/escape dos vídeos contextuais.
- **Exemplo financeiro:** testes Python verificam balanceamento, tipos, repetição de intenção, histórico,
  estorno e concorrência dentro de uma única instância em memória.
- **Interface e distribuição:** inspeção de navegador verifica navegação, foco, teclado, temas, layouts,
  mídia e abertura portátil. É complementar às suites; não equivale a uma cobertura automatizada completa.

`npm run check` agrega sintaxe, testes JavaScript, validação do conteúdo e geração de uma exportação temporária
com conferência do módulo incorporado. Os testes do ledger têm comando separado. O workflow
[`validate.yml`](../.github/workflows/validate.yml) configura essas verificações e formatação para pull requests
e pushes em `main`; ele não representa uma suíte completa de testes de interface.

Os comandos e pré-requisitos estão no [README](../README.md). Um resultado positivo valida o comportamento
exercitado naquele commit e ambiente. Não demonstra ausência de bugs, correção universal do conteúdo, capacidade
de produção ou conformidade integral de acessibilidade.

## Autoria assistida por IA

O desenvolvimento utilizou IA, por meio do Codex, para apoiar pesquisa, extração e organização de material,
redação, geração de código, testes e revisões. O repositório não é apresentado como trabalho escrito integralmente
à mão ou realizado sem assistência.

As saídas de IA foram submetidas a verificações com fontes, validações de dados, testes e inspeções de interface.
O material registra limites de origem e exemplos corrigidos. Esse processo reduz erros específicos, mas IA
também pode produzir explicações plausíveis e incorretas; nenhuma dessas etapas elimina a necessidade de
revisão crítica.

Para uma conversa de avaliação, o repositório funciona como ponto de partida verificável: escolher uma decisão,
examinar o código que a implementa, executar o teste correspondente e discutir o que mudaria sob outro requisito.
As falas simuladas são recursos de estudo, não depoimentos de entrevistas ocorridas nem demonstração automática
de domínio pessoal.

## Próximas decisões, se houver necessidade

Antes de acrescentar serviços ou dependências, seria útil medir o custo inicial do acervo em dispositivos
mais limitados e observar quais caminhos de estudo são mais usados, com consentimento e minimização de dados.
Outras evoluções possíveis são ampliar a automação de acessibilidade, formalizar schemas e migrações de IDs,
reduzir a responsabilidade do módulo de entrada e fortalecer o processo de exportação.

Sincronização remota só se justificaria com um requisito concreto de uso entre dispositivos ou colaboração.
Ela acrescentaria identidade, autorização, resolução de conflitos, retenção e operação. A arquitetura atual
prefere assumir seus limites a introduzir essa complexidade sem demanda.
