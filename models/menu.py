from typing import List

from pydantic import BaseModel


class MenuItem(BaseModel):
    img: str
    name: str


class ToppingGroup(BaseModel):
    name: str
    items: List[MenuItem]


class Category(BaseModel):
    kategorie: str
    menus: List[MenuItem]
    toping: List[ToppingGroup]

class Menu(BaseModel):
    description: str
    name: str
    level: int
    data: List[Category]
