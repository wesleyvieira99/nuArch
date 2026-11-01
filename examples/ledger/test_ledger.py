"""Testes de invariantes, falhas e concorrência; execute com unittest (stdlib)."""

from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from decimal import Decimal
import random
from threading import Barrier
from types import MappingProxyType
import unittest

from pydantic import ValidationError

from ledger import (
    Account,
    AccountConflict,
    AlreadyReversed,
    BalanceOverflow,
    CurrencyMismatch,
    IdempotencyConflict,
    InsufficientFunds,
    InvalidCutoff,
    InvalidReversal,
    InvariantViolation,
    Ledger,
    MAX_CENTS,
    Posting,
    PostRequest,
    ReverseRequest,
    UnknownAccount,
    UnknownTransaction,
)


def posting(account: str, cents: int, currency: str = 'BRL') -> Posting:
    return Posting(account_id=account, currency=currency, delta_cents=cents)


def transfer(key: str, source: str, target: str, cents: int) -> PostRequest:
    return PostRequest(
        idempotency_key=key,
        postings=(posting(source, -cents), posting(target, cents)),
        description='Transferência didática',
    )


class LedgerTests(unittest.TestCase):
    def setUp(self):
        self.ledger = Ledger()
        for account_id in ('alice', 'bob', 'carol'):
            self.ledger.register_account(Account(account_id=account_id, currency='BRL'))
        self.ledger.register_account(
            Account(account_id='clearing', currency='BRL', kind='clearing')
        )
        self.opening = self.ledger.post(transfer('fund-alice', 'clearing', 'alice', 10000))

    def assert_conserved(self):
        for tx in self.ledger.journal:
            currencies = {p.currency for p in tx.postings}
            for currency in currencies:
                self.assertEqual(
                    sum(p.delta_cents for p in tx.postings if p.currency == currency), 0
                )
        for account in self.ledger.accounts:
            replay = sum(
                p.delta_cents
                for tx in self.ledger.journal
                for p in tx.postings
                if p.account_id == account.account_id
            )
            self.assertEqual(self.ledger.balance(account.account_id), replay)
            if account.kind == 'customer':
                self.assertGreaterEqual(replay, 0)

    def test_money_rejects_coercion_bool_zero_and_out_of_range(self):
        for value in (True, False, '100', 100.0, Decimal('100'), 0, MAX_CENTS + 1, -MAX_CENTS - 1):
            with self.subTest(value=value), self.assertRaises(ValidationError):
                Posting(account_id='alice', currency='BRL', delta_cents=value)

    def test_currency_is_explicit_whitelist_not_string_coercion(self):
        for currency in ('brl', 'BRL ', 'JPY', b'BRL', 986):
            with self.subTest(currency=currency), self.assertRaises(ValidationError):
                Posting(account_id='alice', currency=currency, delta_cents=1)

    def test_balance_per_currency_not_only_grand_total(self):
        with self.assertRaises(ValidationError):
            PostRequest(
                idempotency_key='bad-fx',
                postings=(
                    posting('alice', -100, 'BRL'),
                    posting('bob-usd', 100, 'USD'),
                ),
            )
        with self.assertRaises(ValidationError):
            PostRequest(idempotency_key='one', postings=(posting('alice', 100),))
        with self.assertRaises(ValidationError):
            PostRequest(
                idempotency_key='self', postings=(posting('alice', -100), posting('alice', 100))
            )

    def test_registration_is_idempotent_but_metadata_cannot_change(self):
        same = Account(account_id='alice', currency='BRL')
        self.assertEqual(self.ledger.register_account(same), same)
        with self.assertRaises(AccountConflict):
            self.ledger.register_account(Account(account_id='alice', currency='USD'))
        with self.assertRaises(AccountConflict):
            self.ledger.register_account(
                Account(account_id='alice', currency='BRL', kind='clearing')
            )

    def test_unknown_account_and_currency_mismatch_leave_no_commit(self):
        snapshot = self.ledger.journal
        with self.assertRaises(UnknownAccount):
            self.ledger.post(transfer('unknown', 'alice', 'missing', 1))
        self.ledger.register_account(Account(account_id='usd', currency='USD', kind='clearing'))
        with self.assertRaises(CurrencyMismatch):
            self.ledger.post(transfer('wrong-currency', 'alice', 'usd', 1))
        self.assertIs(self.ledger.journal, snapshot)
        self.assertEqual(self.ledger.balance('alice'), 10000)

    def test_same_intent_returns_original_result_after_lost_response(self):
        request = transfer('pay-1', 'alice', 'bob', 1500)
        first = self.ledger.post(request)
        retry = self.ledger.post(request)
        self.assertIs(retry, first)
        self.assertEqual(retry.created_at, first.created_at)
        self.assertEqual(retry.request_hash, first.request_hash)
        self.assertEqual(len(self.ledger.journal), 2)
        self.assertEqual(self.ledger.balance('alice'), 8500)
        self.assertEqual(self.ledger.balance('bob'), 1500)

    def test_canonical_hash_ignores_posting_order_but_not_intent(self):
        request = transfer('pay-order', 'alice', 'bob', 1500)
        first = self.ledger.post(request)
        reordered = request.model_copy(update={'postings': tuple(reversed(request.postings))})
        self.assertIs(self.ledger.post(reordered), first)
        with self.assertRaises(IdempotencyConflict):
            self.ledger.post(transfer('pay-order', 'alice', 'bob', 1600))
        with self.assertRaises(IdempotencyConflict):
            self.ledger.post(request.model_copy(update={'description': 'Outro motivo'}))
        self.assertEqual(len(self.ledger.journal), 2)

    def test_identical_payload_with_new_key_is_a_new_intention(self):
        first = self.ledger.post(transfer('purchase-1', 'alice', 'bob', 100))
        second = self.ledger.post(transfer('purchase-2', 'alice', 'bob', 100))
        self.assertNotEqual(first.tx_id, second.tx_id)
        self.assertEqual(self.ledger.balance('bob'), 200)

    def test_rejected_request_does_not_consume_sequence_or_idempotency_key(self):
        request = transfer('wait-for-funds', 'bob', 'carol', 200)
        before = self.ledger.journal
        with self.assertRaises(InsufficientFunds):
            self.ledger.post(request)
        self.assertIs(self.ledger.journal, before)
        self.ledger.post(transfer('top-up-bob', 'alice', 'bob', 200))
        result = self.ledger.post(request)
        self.assertEqual(result.tx_id, 3)
        self.assertEqual(self.ledger.balance('bob'), 0)
        self.assertEqual(self.ledger.balance('carol'), 200)

    def test_multiple_postings_use_net_delta_at_atomic_commit(self):
        tx = self.ledger.post(
            PostRequest(
                idempotency_key='net-delta',
                postings=(
                    posting('bob', -500),
                    posting('bob', 700),
                    posting('alice', -200),
                ),
            )
        )
        self.assertEqual(self.ledger.balance('bob'), 200)
        self.assertEqual(len(tx.postings), 3)
        self.assert_conserved()

    def test_commit_replays_facts_and_rejects_divergent_balance_projection(self):
        # Injeção de defeito interno: a API pública não permite essa alteração.
        state = self.ledger._state
        incorrect = dict(state.balances)
        incorrect['alice'] += 5000
        self.ledger._state = replace(state, balances=MappingProxyType(incorrect))
        before = self.ledger.journal
        with self.assertRaises(InvariantViolation):
            self.ledger.post(transfer('do-not-trust-cache', 'alice', 'bob', 12000))
        self.assertIs(self.ledger.journal, before)
        self.assertEqual(self.ledger.balance('alice', as_of_tx=1), 10000)

    def test_multicurrency_batch_balances_each_currency(self):
        self.ledger.register_account(Account(account_id='bob-usd', currency='USD'))
        self.ledger.register_account(
            Account(account_id='clearing-usd', currency='USD', kind='clearing')
        )
        self.ledger.post(
            PostRequest(
                idempotency_key='fx-example',
                postings=(
                    posting('alice', -1000),
                    posting('clearing', 1000),
                    posting('bob-usd', 200, 'USD'),
                    posting('clearing-usd', -200, 'USD'),
                ),
            )
        )
        self.assertEqual(self.ledger.balance('alice'), 9000)
        self.assertEqual(self.ledger.balance('bob-usd'), 200)
        self.assert_conserved()

    def test_frozen_transactions_postings_and_old_snapshot_survive_reversal(self):
        tx = self.ledger.post(transfer('immutable', 'alice', 'bob', 1500))
        snapshot = self.ledger.journal
        original_bytes = tx.model_dump_json()
        with self.assertRaises(ValidationError):
            tx.description = 'Alterado'
        with self.assertRaises(ValidationError):
            tx.postings[0].delta_cents = -999
        with self.assertRaises(TypeError):
            tx.postings[0] = posting('alice', -999)
        reversal = self.ledger.reverse(
            ReverseRequest(idempotency_key='undo', original_tx_id=tx.tx_id)
        )
        self.assertEqual(reversal.reversal_of, tx.tx_id)
        self.assertEqual(tx.model_dump_json(), original_bytes)
        self.assertEqual(len(snapshot), 2)
        self.assertEqual(len(self.ledger.journal), 3)
        self.assertEqual(self.ledger.balance('alice'), 10000)
        self.assertEqual(self.ledger.balance('bob'), 0)

    def test_as_of_tx_is_inclusive_and_does_not_follow_future_reversals(self):
        tx = self.ledger.post(transfer('historic', 'alice', 'bob', 1500))
        self.ledger.reverse(
            ReverseRequest(idempotency_key='historic-undo', original_tx_id=tx.tx_id)
        )
        self.assertEqual(self.ledger.balance('alice', as_of_tx=0), 0)
        self.assertEqual(self.ledger.balance('alice', as_of_tx=1), 10000)
        self.assertEqual(self.ledger.balance('alice', as_of_tx=2), 8500)
        self.assertEqual(self.ledger.balance('alice', as_of_tx=3), 10000)
        for cutoff in (-1, 4, True, '2', 2.0):
            with self.subTest(cutoff=cutoff), self.assertRaises(InvalidCutoff):
                self.ledger.balance('alice', as_of_tx=cutoff)
        with self.assertRaises(UnknownAccount):
            self.ledger.balance('missing', as_of_tx=0)

    def test_reversal_retries_and_duplicate_reversal_are_distinct(self):
        tx = self.ledger.post(transfer('original', 'alice', 'bob', 1000))
        request = ReverseRequest(idempotency_key='reverse-1', original_tx_id=tx.tx_id)
        reversal = self.ledger.reverse(request)
        self.assertIs(self.ledger.reverse(request), reversal)
        with self.assertRaises(AlreadyReversed):
            self.ledger.reverse(
                ReverseRequest(idempotency_key='reverse-2', original_tx_id=tx.tx_id)
            )
        with self.assertRaises(InvalidReversal):
            self.ledger.reverse(
                ReverseRequest(idempotency_key='reverse-reversal', original_tx_id=reversal.tx_id)
            )
        with self.assertRaises(UnknownTransaction):
            self.ledger.reverse(ReverseRequest(idempotency_key='missing-tx', original_tx_id=999))
        with self.assertRaises(IdempotencyConflict):
            self.ledger.reverse(ReverseRequest(idempotency_key='original', original_tx_id=tx.tx_id))

    def test_reversal_cannot_overdraw_recipient_and_rejection_is_atomic(self):
        tx = self.ledger.post(transfer('to-bob', 'alice', 'bob', 1500))
        self.ledger.post(transfer('bob-spends', 'bob', 'carol', 1500))
        before = self.ledger.journal
        request = ReverseRequest(idempotency_key='refund-after-spend', original_tx_id=tx.tx_id)
        with self.assertRaises(InsufficientFunds):
            self.ledger.reverse(request)
        self.assertIs(self.ledger.journal, before)
        self.assertEqual(self.ledger.balance('alice'), 8500)
        self.ledger.post(transfer('recover-from-carol', 'carol', 'bob', 1500))
        self.ledger.reverse(request)  # Rejeição anterior não marcou original como estornada.
        self.assertEqual(self.ledger.balance('alice'), 10000)
        self.assert_conserved()

    def test_balance_overflow_is_rejected_without_partial_commit(self):
        ledger = Ledger()
        ledger.register_account(Account(account_id='customer', currency='BRL'))
        ledger.register_account(Account(account_id='clearing', currency='BRL', kind='clearing'))
        ledger.post(transfer('maximum', 'clearing', 'customer', MAX_CENTS))
        snapshot = ledger.journal
        with self.assertRaises(BalanceOverflow):
            ledger.post(transfer('overflow', 'clearing', 'customer', 1))
        self.assertIs(ledger.journal, snapshot)
        self.assertEqual(ledger.balance('customer'), MAX_CENTS)

    def test_revalidation_blocks_unvalidated_model_copy(self):
        request = transfer('forged', 'alice', 'bob', 100)
        invalid = request.model_copy(update={'postings': (posting('alice', -100),)})
        with self.assertRaises(ValidationError):
            self.ledger.post(invalid)
        invalid_account = Account(account_id='new', currency='BRL').model_copy(
            update={'currency': 'JPY'}
        )
        with self.assertRaises(ValidationError):
            self.ledger.register_account(invalid_account)
        self.assertEqual(len(self.ledger.journal), 1)

    def test_concurrent_duplicate_requests_commit_once(self):
        workers = 24
        start = Barrier(workers)
        request = transfer('same-concurrent-intent', 'alice', 'bob', 1000)

        def run(_):
            start.wait(timeout=10)
            return self.ledger.post(request)

        with ThreadPoolExecutor(max_workers=workers) as pool:
            results = list(pool.map(run, range(workers)))
        self.assertTrue(all(tx is results[0] for tx in results))
        self.assertEqual(len(self.ledger.journal), 2)
        self.assertEqual(self.ledger.balance('alice'), 9000)
        self.assertEqual(self.ledger.balance('bob'), 1000)
        self.assert_conserved()

    def test_concurrent_distinct_requests_cannot_overspend(self):
        workers = 20
        start = Barrier(workers)

        def run(index):
            request = transfer(f'competing-{index}', 'alice', 'bob', 1000)
            start.wait(timeout=10)
            try:
                return self.ledger.post(request)
            except InsufficientFunds:
                return None

        with ThreadPoolExecutor(max_workers=workers) as pool:
            results = list(pool.map(run, range(workers)))
        successful = [tx for tx in results if tx is not None]
        self.assertEqual(len(successful), 10)
        self.assertEqual(len(self.ledger.journal), 11)
        self.assertEqual([tx.tx_id for tx in self.ledger.journal], list(range(1, 12)))
        self.assertEqual(self.ledger.balance('alice'), 0)
        self.assertEqual(self.ledger.balance('bob'), 10000)
        self.assert_conserved()

    def test_concurrent_conflicting_payloads_same_key_have_one_winner(self):
        start = Barrier(2)

        def run(cents):
            start.wait(timeout=10)
            try:
                return self.ledger.post(transfer('contested-key', 'alice', 'bob', cents))
            except IdempotencyConflict:
                return None

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(run, [1000, 2000]))
        winners = [tx for tx in results if tx is not None]
        self.assertEqual(len(winners), 1)
        self.assertEqual(len(self.ledger.journal), 2)
        self.assertIn(self.ledger.balance('bob'), [1000, 2000])
        self.assert_conserved()

    def test_concurrent_reversals_with_distinct_keys_reverse_once(self):
        tx = self.ledger.post(transfer('to-reverse', 'alice', 'bob', 1500))
        start = Barrier(8)

        def run(index):
            start.wait(timeout=10)
            try:
                return self.ledger.reverse(
                    ReverseRequest(idempotency_key=f'rev-{index}', original_tx_id=tx.tx_id)
                )
            except AlreadyReversed:
                return None

        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(run, range(8)))
        self.assertEqual(sum(tx is not None for tx in results), 1)
        self.assertEqual(len(self.ledger.journal), 3)
        self.assertEqual(self.ledger.balance('alice'), 10000)
        self.assert_conserved()

    def test_random_history_matches_replay_and_retained_snapshots(self):
        # Gerador determinístico sem dependência extra. Não substitui model checking.
        rng = random.Random(42)
        saved_snapshots = []
        for step in range(150):
            source, target = rng.sample(['alice', 'bob', 'carol'], 2)
            amount = rng.randint(1, 2000)
            request = transfer(f'random-{step}', source, target, amount)
            before = self.ledger.journal
            try:
                tx = self.ledger.post(request)
                self.assertIs(self.ledger.post(request), tx)
            except InsufficientFunds:
                self.assertIs(self.ledger.journal, before)
            saved_snapshots.append(
                (
                    self.ledger.journal,
                    tuple(self.ledger.balance(a) for a in ['alice', 'bob', 'carol']),
                )
            )
            self.assert_conserved()
        for snapshot, expected in saved_snapshots[::11]:
            actual = tuple(
                self.ledger.balance(a, as_of_tx=len(snapshot)) for a in ['alice', 'bob', 'carol']
            )
            self.assertEqual(actual, expected)


if __name__ == '__main__':
    unittest.main(verbosity=2)
