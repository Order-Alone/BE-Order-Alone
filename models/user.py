from pydantic import BaseModel, Field, ConfigDict

class User(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(..., description="Display name shown in the app", examples=["Alex"])
    account_id: str = Field(
        ...,
        validation_alias="accountId",
        description="Unique login id",
        examples=["alex01"],
    )
    password: str = Field(..., description="Raw password (bcrypt 72-byte limit applies)", examples=["string"])
