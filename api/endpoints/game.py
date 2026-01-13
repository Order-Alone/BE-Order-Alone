from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from db.database import database
from models.game import Game
from utils.auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])
game_col = database["game"]
menu_col = database["menu"]
order_col = database["order"]
user_col = database["user"]


class GameStartRequest(BaseModel):
    menu_id: str = Field(..., description="메뉴 id", examples=["64f1c6f0d1a2b3c4d5e6f789"])


class GameEndRequest(BaseModel):
    game_id: str = Field(..., description="게임 id")


def _as_object_id(value: str, label: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid {label} id")


def _serialize_game(game: dict) -> dict:
    game["id"] = str(game["_id"])
    if "menu_id" in game:
        game["menu_id"] = str(game["menu_id"])
    game.pop("_id", None)
    return game


@router.post(
    "/start",
    status_code=status.HTTP_201_CREATED,
    summary="게임 시작",
    description="현재 사용자로 게임을 생성하고 첫 주문을 반환합니다.",
)
async def start_game(body: GameStartRequest, user_id: str = Depends(get_current_user)):
    menu = await menu_col.find_one({"_id": _as_object_id(body.menu_id, "menu")})
    if menu is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu not found")

    game = Game(
        user_id=user_id,
        menu_id=body.menu_id,
        score=0,
        date=datetime.now(timezone.utc),
    )
    game_doc = game.model_dump()
    game_doc["menu_id"] = _as_object_id(body.menu_id, "menu")
    result = await game_col.insert_one(game_doc)
    game_doc["_id"] = result.inserted_id

    # Create first order for the game
    from api.endpoints.order import _pick_random_menu

    selection = _pick_random_menu(menu)
    order_doc = {
        "menu_id": menu["_id"],
        "game_id": game_doc["_id"],
        "menu_name": menu.get("name"),
        "menu_description": menu.get("description"),
        "level": menu.get("level"),
        "selection": selection,
        "created_at": datetime.now(timezone.utc),
    }
    order_result = await order_col.insert_one(order_doc)
    order_doc["_id"] = order_result.inserted_id

    return {
        "order": {
            "id": str(order_doc["_id"]),
            "menu_id": str(order_doc["menu_id"]),
            "game_id": str(order_doc["game_id"]),
            "selection": order_doc["selection"],
        }
    }


@router.post(
    "/end",
    summary="게임 종료",
    description="게임의 최종 점수를 반환합니다.",
)
async def end_game(body: GameEndRequest, user_id: str = Depends(get_current_user)):
    game = await game_col.find_one({"_id": _as_object_id(body.game_id, "game")})
    if game is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    if game.get("user_id") != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Game does not belong to user")
    return {
        "game_id": body.game_id,
        "score": game.get("score", 0),
    }


@router.get(
    "/",
    summary="게임 목록",
    description="현재 사용자의 게임 목록을 반환합니다.",
)
async def list_games(
    user_id: str = Depends(get_current_user),
    limit: int = Query(100, ge=1, le=1000, description="반환할 최대 개수"),
):
    games = await game_col.find({"user_id": user_id}).to_list(limit)
    user = await user_col.find_one({"$or": [{"account_id": user_id}, {"accountId": user_id}]})
    user_name = user.get("name") if user else None
    serialized = [_serialize_game(game) for game in games]
    for game in serialized:
        game["user_name"] = user_name
    return serialized


@router.get(
    "/top",
    summary="상위 점수",
    description="점수 기준 상위 게임을 반환합니다.",
)
async def list_top_games(limit: int = Query(10, ge=1, le=100, description="반환할 최대 개수")):
    games = await game_col.find().sort("score", -1).to_list(limit)
    user_ids = {game.get("user_id") for game in games if game.get("user_id")}
    users = await user_col.find(
        {"$or": [{"account_id": {"$in": list(user_ids)}}, {"accountId": {"$in": list(user_ids)}}]}
    ).to_list(len(user_ids))
    name_map = {}
    for user in users:
        account_id = user.get("account_id") or user.get("accountId")
        if account_id:
            name_map[account_id] = user.get("name")
    serialized = [_serialize_game(game) for game in games]
    for game in serialized:
        game["user_name"] = name_map.get(game.get("user_id"))
    return serialized
