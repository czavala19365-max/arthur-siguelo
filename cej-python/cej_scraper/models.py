from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Expediente(Base):
    __tablename__ = "expedientes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    numero: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    actuaciones: Mapped[list["Actuacion"]] = relationship(
        back_populates="expediente", cascade="all, delete-orphan"
    )


class Actuacion(Base):
    __tablename__ = "actuaciones"
    __table_args__ = (
        UniqueConstraint("expediente_id", "fecha", "acto", "sumilla", name="uq_actuacion_key"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    expediente_id: Mapped[int] = mapped_column(ForeignKey("expedientes.id"), nullable=False, index=True)

    numero: Mapped[str] = mapped_column(String(32), default="", nullable=False)
    fecha: Mapped[str] = mapped_column(String(32), default="", nullable=False)
    acto: Mapped[str] = mapped_column(String(256), default="", nullable=False)
    folio: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    sumilla: Mapped[str] = mapped_column(Text, default="", nullable=False)

    documento_url: Mapped[str] = mapped_column(Text, default="", nullable=False)
    tiene_documento: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    pendiente_notificar: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    scraped_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    expediente: Mapped["Expediente"] = relationship(back_populates="actuaciones")

