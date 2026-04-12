from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from .models import Actuacion, Base, Expediente


@dataclass
class DatabaseManager:
    db_url: str

    def __post_init__(self) -> None:
        self._engine = create_engine(self.db_url, future=True)
        self._SessionLocal = sessionmaker(bind=self._engine, autoflush=False, future=True)

    def init(self) -> None:
        Base.metadata.create_all(self._engine)

    def session(self) -> Session:
        return self._SessionLocal()

    def get_or_create_expediente(self, numero: str) -> Expediente:
        with self.session() as s:
            exp = s.execute(select(Expediente).where(Expediente.numero == numero)).scalar_one_or_none()
            if exp:
                return exp
            exp = Expediente(numero=numero)
            s.add(exp)
            s.commit()
            s.refresh(exp)
            return exp

    def upsert_actuaciones(self, expediente_numero: str, actuaciones: Iterable[dict]) -> list[Actuacion]:
        """
        Inserts only new actuaciones. New ones are marked pendiente_notificar=True.
        Returns the list of newly inserted Actuacion rows.
        """
        with self.session() as s:
            exp = s.execute(select(Expediente).where(Expediente.numero == expediente_numero)).scalar_one()
            inserted: list[Actuacion] = []

            for a in actuaciones:
                row = Actuacion(
                    expediente_id=exp.id,
                    numero=(a.get("numero") or "").strip(),
                    fecha=(a.get("fecha") or "").strip(),
                    acto=(a.get("acto") or "").strip(),
                    folio=(a.get("folio") or "").strip(),
                    sumilla=(a.get("sumilla") or "").strip(),
                    documento_url=(a.get("documento_url") or "").strip(),
                    tiene_documento=bool(a.get("tiene_documento")),
                    pendiente_notificar=True,
                )

                s.add(row)
                try:
                    s.flush()  # triggers uniqueness constraint check
                    inserted.append(row)
                except Exception:
                    s.rollback()
                    # Not inserted (already exists or other issue). Continue.
                    continue

            s.commit()
            return inserted

