# Validação do nuArch

Registro das verificações locais, com a ampliação da coleção de anotações e o histórico da revisão de **01/11/2026**. A situação do GitHub Actions é registrada separadamente.

[Apresentação do projeto](../README.md) · [Arquitetura](ARCHITECTURE.md) · [Testes](../tests/)

## Coleção de anotações `fieldnotes-2026-11-05`

- **Originais:** 30 HEIC enviados à subpasta de Nu e conferidos por nome e tamanho após upload. Não foram alteradas as permissões de compartilhamento.
- **Acervo:** 30 fotos, 60 fichas, sete categorias e 59 referências técnicas. Todas as fotos possuem fichas relacionadas; fontes e rotas são resolvíveis. O catálogo do roteiro passou de 77 para 107 materiais, preservando casos, etapas e atualizações anteriores.
- **Imagens:** 30 WebP de leitura e 30 miniaturas verificadas como imagens válidas e sem EXIF. Originais, hashes e derivados estão registrados em [provenance.json](../assets/fieldnotes/provenance.json).
- **Código:** `npm run check` verifica nove módulos, cinco suites JavaScript, referências, conteúdo e exportação portátil. Os três testes novos cobrem busca por termos sem distinção de acentos, combinação de categoria/consulta e exclusão de dados binários da busca no portátil.
- **Portátil:** exportação gerada com as fotos incorporadas, sem imports pendentes e com sintaxe válida. O arquivo fica próximo de 100 MB por incorporar os acervos visuais; não é o download inicial do portal hospedado.
- **Interface:** inspeção visual em desktop e celular, incluindo busca, filtros, galeria, modal, ampliação, links para etapas e progresso após recarga. Não houve transbordamento horizontal nas telas verificadas. Essa inspeção usou uma versão editorial intermediária; a expansão final do conteúdo e o recolhimento dos links excedentes por foto foram conferidos estruturalmente. O navegador integrado ficou indisponível na conferência final; não se alega nova inspeção visual nessa etapa.
- **Escopo:** a revisão técnica e visual das 30 fotos distingue síntese editorial, texto legível e correções. Os testes verificam integridade, não certificam a exatidão universal do conteúdo. O ledger não foi alterado; seus resultados abaixo pertencem à revisão anterior.

## Ambiente e reprodução

Ambiente local: macOS, Node.js **24.3.0**, npm **11.4.2** e Python **3.10.11**. O projeto declara Node.js 22+; o workflow configura Node.js 22 e Python 3.10. A execução local não confirma a execução nessa matriz de CI.

Na raiz do repositório, em um shell POSIX:

```sh
npm ci
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements-dev.txt
npm run check
npm run test:ledger
npm run format:check
ruff format --check scripts examples/ledger
git diff --check
```

`npm run check` requer Node.js e Python, mas não as dependências do ledger. O interpretador pode ser selecionado por `NUARCH_PYTHON`. O ambiente virtual acima instala também Pydantic e Ruff para executar o conjunto completo. Prettier está fixado no lockfile; Pydantic e Ruff estão fixados nos arquivos de requisitos.

## Histórico de verificações — 01/11/2026

| Área                   | Resultado observado                                        | Escopo                                                                                                               |
| ---------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Sintaxe JavaScript     | **Passou** em oito módulos de `src/`                       | Parsing por Node.js; não prova compatibilidade com todo navegador                                                    |
| Modelos didáticos      | **Passou**                                                 | Interseção de quorums por enumeração, conservação de fluxo, coalescência de cache, pool e orçamento de tokens        |
| Diagramas progressivos | **Passou**: 13 casos, 130 estados, 688 arestas verificadas | Geometria e desvio de obstáculos nas etapas publicadas                                                               |
| Progresso local        | **Passou**: 28 casos                                       | Deltas, conflitos, normalização, importação, falhas de armazenamento e caminhos com lock injetado                    |
| Players contextuais    | **Passou**: dez testes                                     | URLs permitidas, escape, 19 referências reais, timestamp, ausência de autoplay, foco e encerramento do player        |
| Acervo                 | **Passou**                                                 | Referências, IDs, grafos, cronogramas, arquivos locais, cobertura editorial e padrões conhecidos de conteúdo privado |
| HTML portátil          | **Passou**                                                 | Exportação, incorporação de dados/estilos/ativos, ausência de imports pendentes e sintaxe do módulo resultante       |
| Ledger Python          | **Passou**: 23 testes                                      | Balanceamento, idempotência, tipos, concorrência local, histórico, estorno e proteção do journal                     |
| Formatação             | **Passou**                                                 | Prettier, Ruff e `git diff --check`                                                                                  |

As quatro suites JavaScript usam dois formatos de teste. Três arquivos fazem suas próprias asserções; o arquivo de players usa `node:test`. Por isso, o resumo do runner não representa a soma de todas as asserções internas. Os testes de players usam doubles mínimos de DOM; a inspeção em navegador complementa esse escopo.

O validador conferiu 64 arquiteturas, 1.200 perguntas, 120 simulados, 50 vídeos, 29 aulas, 130 conceitos e 77 materiais do roteiro. As contagens verificam integridade e cobertura declarada, não a correção semântica de cada explicação. O inventário completo e os métodos de leitura estão no [guia de conteúdo](CONTENT_GUIDE.md).

## Inspeção da interface

Foram inspecionados o site servido por HTTP, a publicação no GitHub Pages e o HTML portátil. A revisão visual incluiu larguras de 390, 735 e 1.440 pixels, temas claro e escuro, navegação e ausência de rolagem horizontal indevida nas telas verificadas.

Foram exercitados controles de tema e movimento, carregamento explícito de vídeo sem autoplay, restauração de foco ao fechar o player e remoção da iframe ao recolher seu tópico. Foram conferidos início, roteiro, contexto do Nubank, mapa, atlas e videoteca, além da presença das marcas e do conteúdo incorporado na versão portátil.

A pausa escolhida pelo usuário e a preferência de movimento reduzido têm tratamento próprio. As animações SVG são suspensas fora de tela. Isso não constitui auditoria WCAG; também não houve matriz completa de dispositivos, leitores de tela ou provedores de vídeo. Embeds externos podem variar por rede, navegador, política de Referer ou disponibilidade do autor.

## CI e publicação são verificações distintas

O workflow [Validate portal and ledger](../.github/workflows/validate.yml) configura formatação, testes e validação para pushes em `main` e pull requests. Na consulta de 01/11/2026, a [execução 41281794856](https://github.com/wesleyvieira99/nuArch/actions/runs/41281794856) não iniciou o job: o GitHub informou bloqueio de cobrança da conta. Esse resultado não foi tratado como aprovação dos testes nem como falha demonstrada do código.

O [deploy do GitHub Pages da mesma revisão](https://github.com/wesleyvieira99/nuArch/actions/runs/41281794755) concluiu com sucesso. O status de execuções posteriores deve ser consultado na [lista de Actions](https://github.com/wesleyvieira99/nuArch/actions). A publicação atual usa a branch `main`, diretório raiz, com `.nojekyll`; o workflow de validação não é uma barreira obrigatória desse deploy.

## Limites da evidência

- O scanner de privacidade procura padrões conhecidos; não substitui revisão de arquivos e imagens.
- A validação de referências confirma vínculos internos; não garante disponibilidade futura ou suporte de cada afirmação pela fonte externa.
- Modelos e ledger são didáticos. Não houve benchmark, teste de carga em infraestrutura bancária, auditoria de segurança ou validação de liquidação financeira.
- Testes de merge não tornam o caminho síncrono de `localStorage` transacional entre abas. O ledger é isolado em uma instância em memória, sem durabilidade entre reinícios.
- Verificações da interface são amostrais. Não há cobertura automatizada completa de ponta a ponta nem certificação de acessibilidade.

Ao alterar uma garantia, um contrato de dados ou uma integração, atualize o teste correspondente e registre o que foi efetivamente executado. Evite converter um resultado local ou uma contagem em promessa de correção universal.
