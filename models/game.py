from datetime import datetime

from pydantic import BaseModel, Field


class Game(BaseModel):
    user_id: str = Field(..., description="사용자 id")
    user_name: str = Field(..., description="사용자 이름")
    menu_id: str = Field(..., description="메뉴 id")
    score: int = Field(..., description="현재 점수")
    date: datetime = Field(..., description="게임 시작 시각 (UTC)")
