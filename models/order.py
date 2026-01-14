from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class OrderSelection(BaseModel):
    category: str = Field(..., description="선택된 카테고리 이름")
    item: dict = Field(..., description="선택된 메뉴 아이템 정보")
    topping: Optional[list] = Field(None, description="선택된 토핑 정보")


class Order(BaseModel):
    menu_id: str = Field(..., description="메뉴 id")
    game_id: str = Field(..., description="게임 id")
    menu_name: str = Field(..., description="메뉴 이름 스냅샷")
    menu_description: Optional[str] = Field(None, description="메뉴 설명 스냅샷")
    level: Optional[int] = Field(None, description="주문 시점 난이도")
    selection: OrderSelection = Field(..., description="주문 선택 정보")
    created_at: datetime = Field(..., description="생성 시각 (UTC)")
    is_correct: Optional[bool] = Field(None, description="정답 여부")
