from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class OrderSelection(BaseModel):
    category: str
    item: dict
    topping: Optional[list] = None


class Order(BaseModel):
    menu_id: str
    game_id: str
    menu_name: str
    menu_description: Optional[str] = None
    level: Optional[int] = None
    selection: OrderSelection
    created_at: datetime
