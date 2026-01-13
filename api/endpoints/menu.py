from typing import Optional, List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from db.database import database
from models.menu import Menu, Category
from pydantic import BaseModel
from utils.auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])
menu_col = database["menu"]


class MenuUpdate(BaseModel):
    description: Optional[str] = None
    name: Optional[str] = None
    level: Optional[int] = None
    data: Optional[List[Category]] = None


def _as_object_id(menu_id: str) -> ObjectId:
    try:
        return ObjectId(menu_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid menu id")


def _serialize_menu(menu: dict) -> dict:
    menu["id"] = str(menu["_id"])
    menu.pop("_id", None)
    return menu


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_menu(menu: Menu):
    menu_dict = menu.model_dump()
    result = await menu_col.insert_one(menu_dict)
    menu_dict["_id"] = result.inserted_id
    return _serialize_menu(menu_dict)


@router.get("/")
async def list_menus(limit: int = 100):
    menus = await menu_col.find().to_list(limit)
    return [_serialize_menu(menu) for menu in menus]


@router.get("/summary")
async def list_menu_summaries(limit: int = 100):
    menus = await menu_col.find({}, {"name": 1, "description": 1}).to_list(limit)
    return [{"id": str(menu["_id"]), "name": menu.get("name"), "description": menu.get("description")} for menu in menus]


@router.get("/{menu_id}")
async def get_menu(menu_id: str):
    menu = await menu_col.find_one({"_id": _as_object_id(menu_id)})
    if menu is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu not found")
    return _serialize_menu(menu)


@router.put("/{menu_id}")
async def update_menu(menu_id: str, menu: MenuUpdate):
    update = {k: v for k, v in menu.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    result = await menu_col.update_one({"_id": _as_object_id(menu_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu not found")
    updated = await menu_col.find_one({"_id": _as_object_id(menu_id)})
    return _serialize_menu(updated)


@router.delete("/{menu_id}")
async def delete_menu(menu_id: str):
    result = await menu_col.delete_one({"_id": _as_object_id(menu_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu not found")
    return {"message": "Menu deleted"}
