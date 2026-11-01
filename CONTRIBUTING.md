# Contribuir com o nuArch

O projeto aceita melhorias de engenharia, correções técnicas e novos percursos de estudo. Uma contribuição deve tornar uma decisão mais clara ou uma garantia mais verificável.

1. Abra uma issue descrevendo o problema, a página e uma fonte quando se tratar de conteúdo.
2. Preserve os IDs do acervo e as URLs existentes. Renomear uma função é diferente de mudar um link de estudo salvo.
3. Mantenha código em `src/`, apresentação em `styles/`, conhecimento em `data/` e exemplos executáveis em `examples/`.
4. Para conteúdo, siga o [guia editorial](docs/CONTENT_GUIDE.md). Separe mecanismo documentado, caso público datado e hipótese do exercício.
5. Execute `npm run check` e `npm run format:check`. Ao alterar Python, use `ruff format --check scripts examples/ledger`; ao alterar o ledger, execute também `npm run test:ledger`.
6. Descreva a mudança, por que ela é necessária, como foi verificada e qualquer limite remanescente.

Use `npm run format` para JavaScript, HTML, CSS e Markdown. O formatter Python fica em `requirements-dev.txt`. Depois de editar o exemplo do ledger, rode `python3 scripts/embed_ledger.py` para manter a versão exibida no portal sincronizada.

Não inclua dados de candidatos, convites, credenciais, documentos privados ou material de terceiros sem autorização para publicação. Novas bibliotecas devem resolver um problema concreto; o site atual não possui dependências JavaScript em runtime.

Ferramentas de IA podem auxiliar a contribuição. A revisão deve verificar as fontes, o comportamento e as limitações; texto gerado não é evidência técnica por si só.
