from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from starlette import status

from db.database import database
from models.user import User
from utils.auth import (
    get_password_hash,
    create_access_token,
    verify_password,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

user_col = database["user"]
router = APIRouter()

class UserLoginRequest(BaseModel):
    accountId: str
    password: str


@router.post("/signup")
async def signup(user: User):

    existing = await user_col.find_one({"accountId": user.accountId})
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

    hashed_password = get_password_hash(user.password)
    doc = user.model_dump()


    doc["password"] = hashed_password

    result = await user_col.insert_one(doc)

    access_token = create_access_token({"sub": str(user.accountId)})

    from utils.auth import ACCESS_TOKEN_EXPIRE_MINUTES
    return {
        "user": {
            "id": str(result.inserted_id),
            "accountId": user.accountId,
            "name": user.name,
        },
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in_minutes": ACCESS_TOKEN_EXPIRE_MINUTES,
    }

@router.post("/login")
async def login(body: UserLoginRequest):
    user = await user_col.find_one({"accountId": body.accountId})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")
    access_token = create_access_token({"sub": str(user["accountId"])})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in_minutes": ACCESS_TOKEN_EXPIRE_MINUTES
    }
