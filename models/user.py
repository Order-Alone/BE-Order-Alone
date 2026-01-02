from pydantic import BaseModel

class User(BaseModel):
    name: str
    accountId: str
    password: str
