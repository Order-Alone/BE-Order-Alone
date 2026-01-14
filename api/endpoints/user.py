import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, ConfigDict
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
    get_current_user,
    is_password_too_long,
)

user_col = database["user"]
router = APIRouter()
logger = logging.getLogger(__name__)

class UserLoginRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    account_id: str = Field(
        ...,
        validation_alias="accountId",
        description="로그인 아이디",
        examples=["alex01"],
    )
    password: str = Field(..., description="원문 비밀번호", examples=["string"])

class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="로그인 시 발급된 리프레시 토큰", examples=["eyJhbGciOi..."])


@router.post(
    "/signup",
    summary="회원가입",
    description="새 사용자를 등록하고 액세스/리프레시 토큰을 반환합니다.",
)
async def signup(user: User):
    logger.info("signup request account_id=%s password_bytes=%s", user.account_id, len(user.password.encode("utf-8")))
    if is_password_too_long(user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is too long")

    existing = await user_col.find_one(
        {"$or": [{"account_id": user.account_id}, {"accountId": user.account_id}]}
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

    try:
        hashed_password = get_password_hash(user.password)
    except ValueError as exc:
        logger.exception("bcrypt hash failed account_id=%s", user.account_id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is too long",
        ) from exc
    doc = user.model_dump()


    doc["password"] = hashed_password

    result = await user_col.insert_one(doc)

    access_token = create_access_token({"sub": str(user.account_id)})
    refresh_token = create_refresh_token({"sub": str(user.account_id)})

    from utils.auth import ACCESS_TOKEN_EXPIRE_MINUTES
    return {
        "user": {
            "id": str(result.inserted_id),
            "account_id": user.account_id,
            "name": user.name,
        },
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in_minutes": ACCESS_TOKEN_EXPIRE_MINUTES,
        "refresh_expires_in_days": REFRESH_TOKEN_EXPIRE_DAYS,
    }

@router.post(
    "/login",
    summary="로그인",
    description="사용자를 인증하고 액세스/리프레시 토큰을 반환합니다.",
)
async def login(body: UserLoginRequest):
    logger.info("login request account_id=%s password_bytes=%s", body.account_id, len(body.password.encode("utf-8")))
    if is_password_too_long(body.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is too long")
    user = await user_col.find_one(
        {"$or": [{"account_id": body.account_id}, {"accountId": body.account_id}]}
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        password_ok = verify_password(body.password, user["password"])
    except ValueError as exc:
        logger.exception("bcrypt verify failed account_id=%s", body.account_id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is too long",
        ) from exc
    if not password_ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")
    account_id = user.get("account_id") or user.get("accountId")
    access_token = create_access_token({"sub": str(account_id)})
    refresh_token = create_refresh_token({"sub": str(account_id)})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in_minutes": ACCESS_TOKEN_EXPIRE_MINUTES,
        "refresh_expires_in_days": REFRESH_TOKEN_EXPIRE_DAYS,
    }

@router.post(
    "/refresh",
    summary="액세스 토큰 갱신",
    description="리프레시 토큰으로 새 액세스 토큰을 발급합니다.",
)
async def refresh_token(body: RefreshTokenRequest):
    account_id = get_current_refresh_user(body.refresh_token)
    access_token = create_access_token({"sub": str(account_id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in_minutes": ACCESS_TOKEN_EXPIRE_MINUTES,
    }


@router.get(
    "/me",
    summary="내 정보",
    description="현재 로그인 사용자의 정보를 반환합니다.",
)
async def get_me(account_id: str = Depends(get_current_user)):
    user = await user_col.find_one({"$or": [{"account_id": account_id}, {"accountId": account_id}]})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {
        "account_id": user.get("account_id") or user.get("accountId"),
        "name": user.get("name"),
    }
