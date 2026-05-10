import os
from pymongo import MongoClient
from pymongo.database import Database

_client: MongoClient | None = None


def get_mongo() -> Database:
    global _client
    if _client is None:
        uri = os.environ["MONGODB_URI"]
        _client = MongoClient(
            uri,
            tls=True,
            tlsAllowInvalidCertificates=True,
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000,
            socketTimeoutMS=10000,
        )
    return _client["pathlight"]
