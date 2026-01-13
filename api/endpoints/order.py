import random
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from db.database import database
from models.order import Order, OrderSelection
from utils.auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])
menu_col = database["menu"]
order_col = database["order"]
game_col = database["game"]


class OrderCreateRequest(BaseModel):
    game_id: str = Field(..., description="Game id", examples=["64f1c6f0d1a2b3c4d5e6f789"])


class OrderScoreRequest(BaseModel):
    order_id: str = Field(..., description="Order id")
    game_id: str = Field(..., description="Game id")
    category: str = Field(..., description="Selected category name")
    menu_name: str = Field(..., description="Selected menu item name")
    topping_names: Optional[list] = Field(None, description="Selected topping names")


def _as_object_id(value: str, label: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid {label} id")


def _serialize_order(order: dict) -> dict:
    order["id"] = str(order["_id"])
    order.pop("_id", None)
    return order


def _pick_random_menu(menu: dict) -> dict:
    categories = menu.get("data", [])
    if not categories:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Menu has no categories")
    category = random.choice(categories)
    items = category.get("menus", [])
    if not items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category has no items")
    item = random.choice(items)
    toppings = []
    topping_groups = category.get("toping", [])
    for group in topping_groups:
        if random.choice([True, False]):
            group_items = group.get("items", [])
            if group_items:
                topping_item = random.choice(group_items)
                toppings.append({"group": group.get("name"), "item": topping_item})
    if not toppings:
        toppings = None
    return {
        "category": category.get("kategorie"),
        "item": item,
        "topping": toppings,
    }


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    summary="Create order",
    description="Creates a new random order for a game.",
)
async def create_order(body: OrderCreateRequest):
    game = await game_col.find_one({"_id": _as_object_id(body.game_id, "game")})
    if game is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    menu = await menu_col.find_one({"_id": game.get("menu_id")})
    if menu is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu not found")
    selection = _pick_random_menu(menu)
    order = Order(
        menu_id=str(menu["_id"]),
        game_id=body.game_id,
        menu_name=menu.get("name"),
        menu_description=menu.get("description"),
        level=menu.get("level"),
        selection=OrderSelection(**selection),
        created_at=datetime.now(timezone.utc),
    )
    order_doc = order.model_dump()
    order_doc["menu_id"] = menu["_id"]
    order_doc["game_id"] = _as_object_id(body.game_id, "game")
    result = await order_col.insert_one(order_doc)
    order_doc["_id"] = result.inserted_id
    response = _serialize_order(order_doc)
    response["menu_id"] = str(menu["_id"])
    response["game_id"] = body.game_id
    return response


@router.post(
    "/score",
    summary="Score order",
    description="Checks the submitted answer and updates game score if correct.",
)
async def score_order(body: OrderScoreRequest):
    order = await order_col.find_one({"_id": _as_object_id(body.order_id, "order")})
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if str(order.get("game_id")) != body.game_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order does not belong to game")
    selection = order.get("selection", {})
    expected_category = selection.get("category")
    expected_menu = selection.get("item", {}).get("name")
    expected_toppings = []
    if selection.get("topping"):
        for topping in selection["topping"]:
            expected_toppings.append(topping.get("item", {}).get("name"))
    expected_set = set(filter(None, expected_toppings))
    provided_set = set(filter(None, body.topping_names or []))

    is_correct = (
        body.category == expected_category
        and body.menu_name == expected_menu
        and expected_set == provided_set
    )
    if is_correct:
        game = await game_col.find_one({"_id": _as_object_id(body.game_id, "game")})
        if game is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
        level = order.get("level") or 0
        await game_col.update_one(
            {"_id": _as_object_id(body.game_id, "game")},
            {"$inc": {"score": level}},
        )

    return {
        "order_id": body.order_id,
        "correct": is_correct,
        "expected": {
            "category": expected_category,
            "menu_name": expected_menu,
            "topping_names": list(expected_set) if expected_set else [],
        },
    }
