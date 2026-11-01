# Ledger executável: fatos imutáveis e invariantes

Este é um **exercício em memória**, em Python 3.10+ e Pydantic v2. Mostra partidas balanceadas, idempotência, concorrência local, histórico e estorno. Não é um ledger de produção, uma implementação do Datomic ou código oficial do Nubank.

## Executar

Versões verificadas: Python 3.10.11 e Pydantic 2.6.4. A única dependência direta está fixada em `requirements.txt`; os testes usam `unittest`, da biblioteca padrão.

A partir da raiz do repositório:

```sh
python3 -m venv examples/ledger/.venv
examples/ledger/.venv/bin/python -m pip install -r examples/ledger/requirements.txt
examples/ledger/.venv/bin/python examples/ledger/demo.py
examples/ledger/.venv/bin/python -m unittest discover -s examples/ledger -p 'test_*.py' -v
```

Se Pydantic 2.6.4 já estiver no ambiente, os dois últimos comandos podem usar `python3`. O demo abre Alice com R$1.000 e Bruno com R$200, transfere R$150, repete a requisição e depois estorna. O journal termina com três transações: abertura, transferência e estorno.

## API e convenção de sinais

`Account(kind="customer")` representa saldo operacional protegido contra ficar negativo. `kind="clearing"` representa uma contrapartida didática, que pode ter saldo assinado. A criação de uma conta não cria saldo; todo saldo vem de postings balanceados.

`delta_cents > 0` aumenta o saldo operacional; `delta_cents < 0` reduz. Isso **não define débito/crédito contábil universal**: contas de clientes são tipicamente passivos da instituição. Na transferência entre clientes, reduzir o direito de Alice corresponde ao débito do passivo de Alice; aumentar o direito de Bruno corresponde ao crédito do passivo de Bruno. A conta clearing do exemplo não substitui um plano de contas formal.

Depois da abertura do [demo.py](demo.py):

```python
request = PostRequest(
    idempotency_key='transfer-150',
    postings=(
        Posting(account_id='alice', currency='BRL', delta_cents=-15000),
        Posting(account_id='bruno', currency='BRL', delta_cents=15000),
    ),
    description='Alice transfere R$150 para Bruno',
)
tx = ledger.post(request)  # tx_id 2
assert ledger.post(request) is tx  # retry do commit aceito
assert ledger.balance('alice') == 85000
assert ledger.balance('alice', as_of_tx=1) == 100000

undo = ledger.reverse(
    ReverseRequest(
        idempotency_key='reversal-150',
        original_tx_id=tx.tx_id,
    )
)
assert undo.reversal_of == 2  # nova tx_id 3
assert ledger.balance('alice') == 100000
assert ledger.balance('alice', as_of_tx=2) == 85000
```

O corte `as_of_tx` é inclusivo e representa **ordem de commit local**, não data efetiva financeira nem tempo de ocorrência no mundo real. Zero representa o estado antes de qualquer posting. As consultas usam o cadastro atual de contas; não há histórico separado de cadastro.

## O que o código garante dentro de uma instância

- Entre 2 e 1.000 postings por transação, todos não nulos. Valores são inteiros estritos; `float`, `bool`, strings numéricas e `Decimal` são rejeitados. O intervalo é simétrico de `-(2**63-1)` a `2**63-1`, para que inverter um lançamento seja representável.
- Apenas BRL, USD e EUR, todas com duas casas decimais neste exercício. Uma conta tem moeda fixa. O modelo não tenta representar moedas com outras escalas ou quantidades fracionárias de ativos.
- Soma zero **por moeda**, com ao menos duas contas distintas em cada moeda. Somar BRL e USD para obter zero é inválido. Isso valida balanceamento, não prova que o fato econômico, beneficiário ou taxa de câmbio está correto.
- Todas as contas precisam existir. O saldo final agregado de cada conta `customer` deve ser não negativo. Múltiplos postings da mesma conta são avaliados como uma unidade atômica; não existe saldo intermediário visível.
- A mesma chave de um commit aceito, com a mesma intenção canônica, retorna a transação original. Alterar valores, contas, moeda ou descrição gera `IdempotencyConflict`. A ordem dos postings é normalizada no hash; sua multiplicidade é preservada. Uma chave nova representa uma intenção nova, mesmo com payload idêntico.
- A chave usa um namespace global desta instância, compartilhado por `post` e `reverse`. O hash inclui versão de esquema e tipo de operação. Hash não autentica uma requisição nem torna o journal resistente a adulteração por um administrador do processo.
- **Rejeições anteriores ao commit não reservam chave nem tx_id.** Por exemplo, um débito rejeitado por saldo insuficiente pode ser aceito após entrada de fundos. O contrato implementa idempotência de commits aceitos; não faz cache de toda resposta de erro. Persistir resultados de rejeição exigiria outro contrato explícito.
- Estorno integral é uma nova transação com sinais inversos e `reversal_of`. O original continua idêntico. O método `reverse` permite um único estorno por original e rejeita estorno de estorno. Não implementa estorno parcial. Se o destinatário já gastou os fundos, o estorno que o deixaria negativo é rejeitado e exige outra decisão de negócio.

## Onde está a atomicidade

O mesmo `RLock` abrange consulta de idempotência, **agregação do histórico de fatos das contas afetadas**, validação e construção do próximo estado. O caminho didático percorre o journal e soma os postings antes de permitir o débito. Também compara esse saldo reconstituído com o mapa materializado: divergência gera `InvariantViolation` e impede o commit. Todos os dicionários modificados são copiados; mapas internos usam `MappingProxyType`, journal/postings são tuplas, e os modelos públicos são `frozen`. O commit é uma única troca de `self._state`, depois de preparar todo o próximo snapshot. Uma rejeição de validação ou domínio não publica metade da transação.

A API revalida modelos recebidos a partir dos dados, porque `model_copy(update=...)` e `model_construct(...)` podem produzir modelos sem a validação normal. A imutabilidade protege o uso normal da API; código Python com acesso arbitrário à memória/introspecção não é um adversário isolado por esse mecanismo.

## Limites e custo do exercício

| Tema          | Este exemplo                                                 | O que faltaria em um serviço real                                                                                   |
| ------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Concorrência  | Uma instância e threads que usam seu lock                    | Coordenação entre processos/réplicas, transação no armazenamento, autoridade de escrita e fencing quando necessário |
| Durabilidade  | Tudo está em RAM; encerrar o processo perde journal e chaves | Persistência durável, recuperação, backup testado, políticas de retenção e disponibilidade                          |
| Integrações   | Nenhuma chamada externa dentro do commit                     | Outbox/inbox, identidade estável, reconciliação e tratamento de resultados incertos                                 |
| Segurança     | API interna confiável, sem autenticação                      | Autorização por conta/ação, limites, revisão de comandos, trilha de acesso e proteção de dados                      |
| Contabilidade | Postings assinados e soma zero por moeda                     | Plano de contas, ativos/passivos, reservas, juros, tarifas, datas efetivas e reconciliação com fatos externos       |
| Temporalidade | Replay até um tx_id local                                    | Semântica explícita de tempo de negócio, correções retroativas e modelo bitemporal quando necessário                |

O lock não é uma eleição de líder, um lock distribuído ou um transactor do Datomic. Duas instâncias têm estados independentes. O `as_of_tx` aqui é uma soma sobre journal; não implementa os índices, datoms, Datalog, histórico de assertions/retractions ou filtros de database value do Datomic. A analogia útil é tomar decisões sobre um estado consistente e produzir novos fatos; as garantias operacionais são diferentes.

Com A contas, T commits, P postings no comando e H postings já registrados, o hash custa O(P log P) pela ordenação. A validação de saldo percorre H fatos; cópias de mapas/journal acrescentam custo aproximado O(A + T), totalizando O(H + A + T + P log P), além dos bytes serializados. Saldo atual consulta mapa em O(1) esperado; saldo histórico percorre postings até o corte. Esse replay dentro do caminho de escrita favorece o entendimento, não alto throughput. Uma implementação real pode usar checkpoint verificado mais fatos posteriores, ou saldo autoritativo mantido atomicamente com o journal, com reconciliação e regra de versão; confiar em um cache eventual não oferece a mesma garantia. Não há números de benchmark nem promessa de latência.

## Testes e referências

Os 23 testes cobrem tipos estritos, moedas, balanceamento, cadastro, rejeição sem efeito parcial, hash, repetição de intenção, histórico, imutabilidade, overflow e estorno. Uma injeção de defeito na projeção prova que o commit detecta divergência ao agregar fatos. Testes concorrentes lançam 24 duplicatas da mesma intenção, 20 débitos que disputam o mesmo saldo, duas versões da mesma chave e oito tentativas de estorno. Um histórico pseudoaleatório determinístico compara saldos materializados com replay e snapshots antigos.

Referências consultadas:

- [Pydantic 2.6 — Strict mode](https://docs.pydantic.dev/2.6/concepts/strict_mode/).
- [Pydantic 2.6 — Models e faux immutability](https://docs.pydantic.dev/2.6/concepts/models/).
- [Python — RLock](https://docs.python.org/3.10/library/threading.html#rlock-objects).
- [Datomic — Transaction Functions](https://docs.datomic.com/transactions/transaction-functions.html).
- [Datomic — Database Filters](https://docs.datomic.com/reference/filters.html).
