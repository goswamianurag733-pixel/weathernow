# Lightweight data structures kept separate so the project can later
# migrate from JSON demo data to PostgreSQL/SQLAlchemy models.

from dataclasses import dataclass

@dataclass
class Facility:
    id: str
    name: str
    state: str
    district: str
    beds_total: int
    beds_available: int
    staff_total: int
    staff_present: int

@dataclass
class Resource:
    facility_id: str
    facility_name: str
    medicine: str
    current_stock: int
    daily_consumption: float
    safety_stock: int
