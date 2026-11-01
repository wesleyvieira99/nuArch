"""Exemplo alinhado ao laboratório: Alice R$1.000, Bruno R$200, envio R$150."""

from ledger import Account, Ledger, Posting, PostRequest, ReverseRequest


def main() -> None:
    ledger = Ledger()
    ledger.register_account(Account(account_id='alice', currency='BRL'))
    ledger.register_account(Account(account_id='bruno', currency='BRL'))
    ledger.register_account(Account(account_id='clearing', currency='BRL', kind='clearing'))

    # Abertura didática: a contrapartida não é dinheiro criado sem origem.
    # Num sistema real, ela representa um fato externo previamente validado.
    opening = ledger.post(
        PostRequest(
            idempotency_key='opening-1',
            postings=(
                Posting(account_id='alice', currency='BRL', delta_cents=100000),
                Posting(account_id='bruno', currency='BRL', delta_cents=20000),
                Posting(account_id='clearing', currency='BRL', delta_cents=-120000),
            ),
            description='Saldos iniciais do exercício',
        )
    )
    request = PostRequest(
        idempotency_key='transfer-150',
        postings=(
            Posting(account_id='alice', currency='BRL', delta_cents=-15000),
            Posting(account_id='bruno', currency='BRL', delta_cents=15000),
        ),
        description='Alice transfere R$150 para Bruno',
    )
    transfer = ledger.post(request)
    retry = ledger.post(request)
    assert retry is transfer  # Mesma tx, mesmo horário e mesmo resultado.
    assert ledger.balance('alice') == 85000
    assert ledger.balance('bruno') == 35000

    reversal = ledger.reverse(
        ReverseRequest(
            idempotency_key='reversal-150',
            original_tx_id=transfer.tx_id,
        )
    )
    assert reversal.reversal_of == transfer.tx_id
    assert ledger.balance('alice') == 100000
    assert ledger.balance('bruno') == 20000
    assert ledger.balance('alice', as_of_tx=opening.tx_id) == 100000
    assert ledger.balance('alice', as_of_tx=transfer.tx_id) == 85000
    assert len(ledger.journal) == 3  # O retry não acrescenta evento; o estorno sim.

    for tx in ledger.journal:
        print(tx.model_dump_json(indent=2))
    print('Saldo atual Alice:', ledger.balance('alice'), 'centavos')
    print('Saldo histórico Alice na tx 2:', ledger.balance('alice', as_of_tx=2), 'centavos')


if __name__ == '__main__':
    main()
