from fastapi import APIRouter

from api.endpoints import game, menu, order, user

api_router = APIRouter()

api_router.include_router(user.router, prefix="/user", tags=["user"])
api_router.include_router(menu.router, prefix="/menu", tags=["menu"])
api_router.include_router(order.router, prefix="/order", tags=["order"])
api_router.include_router(game.router, prefix="/game", tags=["game"])
