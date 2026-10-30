"""Ledger didático em memória: uma instância, um processo, threads coordenadas.

Não é uma implementação de produção nem um emulador do Datomic.
A API expõe fatos imutáveis; cada commit troca um snapshot sob RLock.
Sinais são operacionais: +delta aumenta saldo; -delta reduz saldo.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, replace
from datetime import datetime, timezone
from hashlib import sha256
import json
from threading import RLock
from types import MappingProxyType
from typing import Annotated, Literal, Mapping

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


MAX_CENTS = 2**63 - 1
# Apenas moedas com duas casas decimais neste exercício. Não é um catálogo ISO.
Currency = Literal["BRL", "USD", "EUR"]
Identifier = Annotated[
    str, Field(strict=True, min_length=1, max_length=64,
               pattern=r"^[A-Za-z0-9][A-Za-z0-9._:-]*$")
]
IdempotencyKey = Annotated[
    str, Field(strict=True, min_length=1, max_length=128,
               pattern=r"^[A-Za-z0-9][A-Za-z0-9._:-]*$")
]
Cents = Annotated[int, Field(strict=True, ge=-MAX_CENTS, le=MAX_CENTS)]
TxId = Annotated[int, Field(strict=True, ge=1)]
Description = Annotated[str, Field(strict=True, max_length=240)]


class ImmutableModel(BaseModel):
    model_config = ConfigDict(frozen=True, strict=True, extra="forbid")


class Account(ImmutableModel):
    account_id: Identifier
    currency: Currency
    # customer é uma conta operacional protegida, não "debit-normal" contábil.
    kind: Literal["customer", "clearing"] = "customer"


class Posting(ImmutableModel):
    account_id: Identifier
    currency: Currency
    delta_cents: Cents

    @field_validator("delta_cents")
    @classmethod
    def nonzero(cls, value: int) -> int:
        if value == 0:
            raise ValueError("Um posting não pode ter valor zero.")
        return value


def _check_balanced(postings: tuple[Posting, ...]) -> None:
    totals: dict[str, int] = defaultdict(int)
    accounts: dict[str, set[str]] = defaultdict(set)
    for posting in postings:
        totals[posting.currency] += posting.delta_cents
        accounts[posting.currency].add(posting.account_id)
    for currency, total in totals.items():
        if total != 0:
            raise ValueError(f"Postings não fecham em {currency}: delta={total}.")
        if len(accounts[currency]) < 2:
            raise ValueError(f"Exija ao menos duas contas distintas em {currency}.")


class PostRequest(ImmutableModel):
    idempotency_key: IdempotencyKey
    postings: tuple[Posting, ...] = Field(min_length=2, max_length=1000)
    description: Description = ""

    @model_validator(mode="after")
    def balanced_by_currency(self):
        _check_balanced(self.postings)
        return self


class ReverseRequest(ImmutableModel):
    idempotency_key: IdempotencyKey
    original_tx_id: TxId
    description: Description = "Estorno integral"


class Transaction(PostRequest):
    tx_id: TxId
    request_hash: Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
    created_at: datetime
    reversal_of: TxId | None = None

    @field_validator("created_at")
    @classmethod
    def aware_time(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("created_at precisa de timezone.")
        return value


class LedgerError(Exception):
    """Rejeição de domínio; nenhum commit parcial deve ser observável."""


class AccountConflict(LedgerError):
    pass


class UnknownAccount(LedgerError):
    pass


class CurrencyMismatch(LedgerError):
    pass


class InsufficientFunds(LedgerError):
    pass


class BalanceOverflow(LedgerError):
    pass


class InvariantViolation(LedgerError):
    pass


class IdempotencyConflict(LedgerError):
    pass


class UnknownTransaction(LedgerError):
    pass


class AlreadyReversed(LedgerError):
    pass


class InvalidReversal(LedgerError):
    pass


class InvalidCutoff(LedgerError):
    pass


@dataclass(frozen=True)
class _DedupEntry:
    request_hash: str
    result: Transaction


@dataclass(frozen=True)
class _State:
    accounts: Mapping[str, Account]
    balances: Mapping[str, int]
    journal: tuple[Transaction, ...]
    dedup: Mapping[str, _DedupEntry]
    reversed_by: Mapping[int, int]


def _empty_state() -> _State:
    return _State(
        accounts=MappingProxyType({}), balances=MappingProxyType({}),
        journal=(), dedup=MappingProxyType({}), reversed_by=MappingProxyType({}),
    )


def _request_hash(request: PostRequest | ReverseRequest) -> str:
    """Hash semântico versionado; a chave identifica intenção, não entra no hash.

    Ordenação de postings não muda o efeito e é normalizada. Multiplicidade,
    valores, moedas e descrição continuam fazendo parte do contrato.
    """
    payload = request.model_dump(mode="json", exclude={"idempotency_key"})
    if isinstance(request, ReverseRequest):
        operation = "reverse"
    else:
        operation = "post"
        payload["postings"] = sorted(
            payload["postings"],
            key=lambda p: (p["account_id"], p["currency"], p["delta_cents"]),
        )
    encoded = json.dumps(
        {"schema": 1, "operation": operation, "request": payload},
        sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False,
    ).encode("utf-8")
    return sha256(encoded).hexdigest()


class Ledger:
    """Escritor serializado por instância; sem persistência e sem rede.

    Todos os métodos públicos usam o mesmo lock. Não há I/O nem callbacks de
    aplicação dentro dele. O ponto de commit é a troca única de self._state.
    """

    def __init__(self) -> None:
        self._lock = RLock()
        self._state = _empty_state()

    def register_account(self, account: Account) -> Account:
        if not isinstance(account, Account):
            raise TypeError("Passe um Account validado.")
        # Revalidar a partir de dados evita confiar em model_copy/model_construct.
        account = Account.model_validate(account.model_dump(mode="python"))
        with self._lock:
            state = self._state
            existing = state.accounts.get(account.account_id)
            if existing is not None:
                if existing != account:
                    raise AccountConflict("ID já cadastrado com outros atributos.")
                return existing
            accounts = dict(state.accounts)
            balances = dict(state.balances)
            accounts[account.account_id] = account
            balances[account.account_id] = 0
            self._state = replace(
                state, accounts=MappingProxyType(accounts),
                balances=MappingProxyType(balances),
            )
            return account

    def post(self, request: PostRequest) -> Transaction:
        if not isinstance(request, PostRequest) or isinstance(request, Transaction):
            raise TypeError("Passe um PostRequest, não uma Transaction existente.")
        request = PostRequest.model_validate(request.model_dump(mode="python"))
        fingerprint = _request_hash(request)
        with self._lock:
            state = self._state
            duplicate = self._duplicate(state, request.idempotency_key, fingerprint)
            if duplicate is not None:
                return duplicate
            return self._append(
                state=state, key=request.idempotency_key,
                fingerprint=fingerprint, postings=request.postings,
                description=request.description, reversal_of=None,
            )

    def reverse(self, request: ReverseRequest) -> Transaction:
        if not isinstance(request, ReverseRequest):
            raise TypeError("Passe um ReverseRequest validado.")
        request = ReverseRequest.model_validate(request.model_dump(mode="python"))
        fingerprint = _request_hash(request)
        with self._lock:
            state = self._state
            duplicate = self._duplicate(state, request.idempotency_key, fingerprint)
            if duplicate is not None:
                return duplicate
            if request.original_tx_id > len(state.journal):
                raise UnknownTransaction(f"Tx inexistente: {request.original_tx_id}.")
            original = state.journal[request.original_tx_id - 1]
            if original.reversal_of is not None:
                raise InvalidReversal("Este exercício não permite estornar um estorno.")
            if original.tx_id in state.reversed_by:
                raise AlreadyReversed(
                    f"Tx {original.tx_id} já estornada por {state.reversed_by[original.tx_id]}."
                )
            inverse = tuple(
                Posting(account_id=p.account_id, currency=p.currency,
                        delta_cents=-p.delta_cents)
                for p in original.postings
            )
            return self._append(
                state=state, key=request.idempotency_key,
                fingerprint=fingerprint, postings=inverse,
                description=request.description, reversal_of=original.tx_id,
            )

    @staticmethod
    def _duplicate(state: _State, key: str, fingerprint: str) -> Transaction | None:
        entry = state.dedup.get(key)
        if entry is None:
            return None
        if entry.request_hash != fingerprint:
            raise IdempotencyConflict("Chave já usada com outra intenção/payload.")
        return entry.result

    def _append(
        self, *, state: _State, key: str, fingerprint: str,
        postings: tuple[Posting, ...], description: str, reversal_of: int | None,
    ) -> Transaction:
        """Chamado somente sob self._lock; prepara tudo antes da troca de estado."""
        _check_balanced(postings)
        deltas: dict[str, int] = defaultdict(int)
        for posting in postings:
            account = state.accounts.get(posting.account_id)
            if account is None:
                raise UnknownAccount(f"Conta não registrada: {posting.account_id}.")
            if account.currency != posting.currency:
                raise CurrencyMismatch(
                    f"Conta {account.account_id} é {account.currency}, não {posting.currency}."
                )
            deltas[posting.account_id] += posting.delta_cents

        # Caminho didático: reconstituir saldos a partir de todos os fatos,
        # dentro do lock. O mapa de saldo é projeção, não prova independente.
        replayed = {account_id: 0 for account_id in deltas}
        for prior_tx in state.journal:
            for prior_posting in prior_tx.postings:
                if prior_posting.account_id in replayed:
                    replayed[prior_posting.account_id] += prior_posting.delta_cents
        for account_id, historical_balance in replayed.items():
            if state.balances[account_id] != historical_balance:
                raise InvariantViolation(
                    f"Projeção de saldo diverge do journal em {account_id}."
                )

        balances = dict(state.balances)
        # Validação sobre o delta agregado da transação: não há saldo parcial visível.
        for account_id, delta in deltas.items():
            resulting = replayed[account_id] + delta
            if not -MAX_CENTS <= resulting <= MAX_CENTS:
                raise BalanceOverflow(f"Saldo fora do intervalo em {account_id}.")
            if state.accounts[account_id].kind == "customer" and resulting < 0:
                raise InsufficientFunds(f"Saldo insuficiente em {account_id}.")
            balances[account_id] = resulting

        tx = Transaction(
            tx_id=len(state.journal) + 1, idempotency_key=key,
            request_hash=fingerprint, created_at=datetime.now(timezone.utc),
            postings=postings, description=description, reversal_of=reversal_of,
        )
        dedup = dict(state.dedup)
        dedup[key] = _DedupEntry(fingerprint, tx)
        reversed_by = dict(state.reversed_by)
        if reversal_of is not None:
            reversed_by[reversal_of] = tx.tx_id
        next_state = _State(
            accounts=state.accounts, balances=MappingProxyType(balances),
            journal=state.journal + (tx,), dedup=MappingProxyType(dedup),
            reversed_by=MappingProxyType(reversed_by),
        )
        self._state = next_state  # Linearização local: um snapshot completo substitui outro.
        return tx

    def balance(self, account_id: str, *, as_of_tx: int | None = None) -> int:
        """Saldo inclusive até tx_id; zero significa antes de qualquer posting.

        O corte é ordem de commit local, não data efetiva contábil ou tempo real.
        """
        if type(account_id) is not str:
            raise TypeError("account_id precisa ser str.")
        with self._lock:
            state = self._state
            if account_id not in state.accounts:
                raise UnknownAccount(f"Conta não registrada: {account_id}.")
            if as_of_tx is None:
                return state.balances[account_id]
            if type(as_of_tx) is not int or not 0 <= as_of_tx <= len(state.journal):
                raise InvalidCutoff("as_of_tx deve ser inteiro entre zero e a última tx.")
            return sum(
                p.delta_cents
                for tx in state.journal[:as_of_tx]
                for p in tx.postings
                if p.account_id == account_id
            )

    @property
    def journal(self) -> tuple[Transaction, ...]:
        """Snapshot de objetos frozen e tuplas; nenhuma coleção mutável é exposta."""
        with self._lock:
            return self._state.journal

    @property
    def accounts(self) -> tuple[Account, ...]:
        with self._lock:
            return tuple(self._state.accounts.values())
