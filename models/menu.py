from typing import List

from pydantic import BaseModel, Field


class MenuItem(BaseModel):
    img: str = Field(..., description="Image URL or path")
    name: str = Field(..., description="Menu item name", examples=["Latte"])


class ToppingGroup(BaseModel):
    name: str = Field(..., description="Topping group name", examples=["Syrup"])
    items: List[MenuItem] = Field(..., description="Available toppings")


class Category(BaseModel):
    kategorie: str = Field(..., description="Category name", examples=["Coffee"])
    menus: List[MenuItem] = Field(..., description="Menu items in the category")
    toping: List[ToppingGroup] = Field(..., description="Available topping groups")

class Menu(BaseModel):
    description: str = Field(..., description="Short description", examples=["Cafe menu"])
    name: str = Field(..., description="Menu title", examples=["Cafe V1"])
    level: int = Field(..., description="Difficulty score used for game scoring", examples=[3])
    data: List[Category] = Field(..., description="Menu categories")
