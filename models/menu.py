from typing import List

from pydantic import BaseModel, Field


class MenuItem(BaseModel):
    img: str = Field(..., description="이미지 URL 또는 경로")
    name: str = Field(..., description="메뉴 아이템 이름", examples=["Latte"])


class ToppingGroup(BaseModel):
    name: str = Field(..., description="토핑 그룹 이름", examples=["Syrup"])
    items: List[MenuItem] = Field(..., description="선택 가능한 토핑 목록")


class Category(BaseModel):
    kategorie: str = Field(..., description="카테고리 이름", examples=["Coffee"])
    menus: List[MenuItem] = Field(..., description="카테고리 내 메뉴 목록")
    toping: List[ToppingGroup] = Field(..., description="사용 가능한 토핑 그룹")

class Menu(BaseModel):
    description: str = Field(..., description="짧은 설명", examples=["Cafe menu"])
    name: str = Field(..., description="메뉴 제목", examples=["Cafe V1"])
    level: int = Field(..., description="게임 점수 계산에 쓰이는 난이도", examples=[3])
    data: List[Category] = Field(..., description="메뉴 카테고리 목록")
