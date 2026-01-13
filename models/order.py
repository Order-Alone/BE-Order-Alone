from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class OrderSelection(BaseModel):
    category: str = Field(..., description="Selected category name")
    item: dict = Field(..., description="Selected menu item payload")
    topping: Optional[list] = Field(None, description="Selected toppings payload")


class Order(BaseModel):
    menu_id: str = Field(..., description="Menu id")
    game_id: str = Field(..., description="Game id")
    menu_name: str = Field(..., description="Menu name snapshot")
    menu_description: Optional[str] = Field(None, description="Menu description snapshot")
    level: Optional[int] = Field(None, description="Difficulty score at time of order")
    selection: OrderSelection = Field(..., description="Order selection payload")
    created_at: datetime = Field(..., description="Creation timestamp (UTC)")
