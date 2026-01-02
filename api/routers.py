from fastapi import APIRouter

from api.endpoints import test, user, menu

api_router = APIRouter()

api_router.include_router(test.router, prefix="/test", tags=["test"])
api_router.include_router(user.router, prefix="/user", tags=["user"])
api_router.include_router(menu.router, prefix="/menu", tags=["menu"])