import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from starlette import status

from db.database import database
from models.user import User
from utils.auth import (
    get_password_hash,
    create_access_token,
    create_refresh_token,
    verify_password,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    get_current_refresh_user,
    is_password_too_long,
)

user_col = database["user"]
router = APIRouter()
logger = logging.getLogger(__name__)

class UserLoginRequest(BaseModel):
    accountId: str
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.post("/signup")
async def signup(user: User):
    logger.info("signup request accountId=%s password_bytes=%s", user.accountId, len(user.password.encode("utf-8")))
    if is_password_too_long(user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is too long")

    existing = await user_col.find_one({"accountId": user.accountId})
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

    try:
        hashed_password = get_password_hash(user.password)
    except ValueError as exc:
        logger.exception("bcrypt hash failed accountId=%s", user.accountId)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is too long",
        ) from exc
    doc = user.model_dump()


    doc["password"] = hashed_password

    result = await user_col.insert_one(doc)

    access_token = create_access_token({"sub": str(user.accountId)})
    refresh_token = create_refresh_token({"sub": str(user.accountId)})

    from utils.auth import ACCESS_TOKEN_EXPIRE_MINUTES
    return {
        "user": {
            "id": str(result.inserted_id),
            "accountId": user.accountId,
            "name": user.name,
        },
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in_minutes": ACCESS_TOKEN_EXPIRE_MINUTES,
        "refresh_expires_in_days": REFRESH_TOKEN_EXPIRE_DAYS,
    }

@router.post("/login")
async def login(body: UserLoginRequest):
    logger.info("login request accountId=%s password_bytes=%s", body.accountId, len(body.password.encode("utf-8")))
    if is_password_too_long(body.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is too long")
    user = await user_col.find_one({"accountId": body.accountId})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        password_ok = verify_password(body.password, user["password"])
    except ValueError as exc:
        logger.exception("bcrypt verify failed accountId=%s", body.accountId)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is too long",
        ) from exc
    if not password_ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")
    access_token = create_access_token({"sub": str(user["accountId"])})
    refresh_token = create_refresh_token({"sub": str(user["accountId"])})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in_minutes": ACCESS_TOKEN_EXPIRE_MINUTES,
        "refresh_expires_in_days": REFRESH_TOKEN_EXPIRE_DAYS,
    }

@router.post("/refresh")
async def refresh_token(body: RefreshTokenRequest):
    account_id = get_current_refresh_user(body.refresh_token)
    access_token = create_access_token({"sub": str(account_id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in_minutes": ACCESS_TOKEN_EXPIRE_MINUTES,
    }
