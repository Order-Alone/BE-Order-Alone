import random
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from db.database import database
from models.order import Order, OrderSelection
from utils.auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])
menu_col = database["menu"]
order_col = database["order"]
game_col = database["game"]


class OrderCreateRequest(BaseModel):
    game_id: str = Field(..., description="게임 id", examples=["64f1c6f0d1a2b3c4d5e6f789"])


class OrderScoreRequest(BaseModel):
    order_id: str = Field(..., description="주문 id")
    game_id: str = Field(..., description="게임 id")
    category: str = Field(..., description="선택한 카테고리 이름")
    menu_name: str = Field(..., description="선택한 메뉴 아이템 이름")
    topping_names: Optional[list] = Field(None, description="선택한 토핑 이름 목록")


def _as_object_id(value: str, label: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid {label} id")


def _serialize_order(order: dict) -> dict:
    order["id"] = str(order["_id"])
    if "menu_id" in order:
        order["menu_id"] = str(order["menu_id"])
    if "game_id" in order:
        order["game_id"] = str(order["game_id"])
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
    summary="주문 생성",
    description="게임에 대한 랜덤 주문을 생성합니다.",
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
    order_doc["is_correct"] = False
    result = await order_col.insert_one(order_doc)
    order_doc["_id"] = result.inserted_id
    response = _serialize_order(order_doc)
    response["menu_id"] = str(menu["_id"])
    response["game_id"] = body.game_id
    return response


@router.post(
    "/score",
    summary="주문 채점",
    description="제출 답안을 확인하고 정답이면 게임 점수를 갱신합니다.",
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
        await order_col.update_one(
            {"_id": _as_object_id(body.order_id, "order")},
            {"$set": {"is_correct": True}},
        )
    else:
        await order_col.delete_one({"_id": _as_object_id(body.order_id, "order")})

    return {
        "order_id": body.order_id,
        "correct": is_correct,
        "expected": {
            "category": expected_category,
            "menu_name": expected_menu,
            "topping_names": list(expected_set) if expected_set else [],
        },
    }


@router.get("/game/{game_id}")
async def list_orders_by_game(
    game_id: str,
    user_id: str = Depends(get_current_user),
    limit: int = Query(100, ge=1, le=1000),
):
    game = await game_col.find_one({"_id": _as_object_id(game_id, "game")})
    if game is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    if game.get("user_id") != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Game does not belong to user")
    orders = await order_col.find(
        {"game_id": _as_object_id(game_id, "game"), "is_correct": True}
    ).to_list(limit)
    return [_serialize_order(order) for order in orders]
