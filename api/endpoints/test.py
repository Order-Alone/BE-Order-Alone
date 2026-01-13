from bson import ObjectId
from fastapi import HTTPException, APIRouter

from db.database import database
from models.item import Item

router = APIRouter()

@router.get("/")
async def read_root():
	return {"message": "MongoDB 튜토리얼 FastAPI에 오신 것을 환영합니다!"}

@router.post("/items/")
async def create_item(item: Item):
	item_dict = item.model_dump()
	result = await database["items"].insert_one(item_dict)
	item_dict["id"] = str(result.inserted_id)
	return item_dict

@router.get("/items/")
async def get_items():
    items = await database["items"].find().to_list(1000)
    for item in items:
        item["id"] = str(item["_id"])
        item.pop("_id", None)
    return items

@router.get("/items/{item_id}")
async def get_item(item_id: str):
    item = await database["items"].find_one({"_id": ObjectId(item_id)})
    if item:
        item["id"] = str(item["_id"])
        item.pop("_id", None)
        return item
    raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")

@router.put("/items/{item_id}")
async def update_item(item_id: str, item: Item):
    result = await database["items"].update_one(
        {"_id": ObjectId(item_id)}, {"$set": item.model_dump()}
    )
    if result.modified_count == 1:
        updated_item = await database["items"].find_one({"_id": ObjectId(item_id)})
        updated_item["id"] = str(updated_item["_id"])
        updated_item.pop("_id", None)
        return updated_item
    raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")

@router.delete("/items/{item_id}")
async def delete_item(item_id: str):
    result = await database["items"].delete_one({"_id": ObjectId(item_id)})
    if result.deleted_count == 1:
        return {"message": "항목이 삭제되었습니다."}
    raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")
