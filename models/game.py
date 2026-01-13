from datetime import datetime

from pydantic import BaseModel


class Game(BaseModel):
    user_id: str
    menu_id: str
    score: int
    date: datetime
