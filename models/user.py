from pydantic import BaseModel, Field, ConfigDict

class User(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(..., description="앱에서 표시되는 이름", examples=["Alex"])
    account_id: str = Field(
        ...,
        validation_alias="accountId",
        description="로그인에 사용하는 고유 아이디",
        examples=["alex01"],
    )
    password: str = Field(..., description="원문 비밀번호 (bcrypt 72바이트 제한)", examples=["string"])
