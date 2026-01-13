import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_DETAILS = os.getenv("MONGO_DETAILS", "mongodb://localhost:27017")

client = AsyncIOMotorClient(MONGO_DETAILS)
database = client["order_alone"]