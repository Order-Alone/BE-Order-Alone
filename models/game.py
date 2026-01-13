from datetime import datetime

from pydantic import BaseModel, Field


class Game(BaseModel):
    user_id: str = Field(..., description="User id")
    menu_id: str = Field(..., description="Menu id")
    score: int = Field(..., description="Current score")
    date: datetime = Field(..., description="Game start time (UTC)")
