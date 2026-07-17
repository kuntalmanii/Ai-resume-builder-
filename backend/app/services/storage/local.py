"""Local filesystem storage driver."""
import os

import aiofiles

from app.services.storage.base import BaseStorage


class LocalStorage(BaseStorage):
    def __init__(self, base_dir: str = "uploads/exports"):
        self.base_dir = base_dir
        os.makedirs(base_dir, exist_ok=True)

    async def save(self, filename: str, data: bytes) -> str:
        full_path = os.path.abspath(os.path.join(self.base_dir, filename))
        async with aiofiles.open(full_path, "wb") as f:
            await f.write(data)
        return full_path

    async def read(self, path: str) -> bytes:
        if not os.path.exists(path):
            raise FileNotFoundError(f"File not found: {path}")
        async with aiofiles.open(path, "rb") as f:
            return await f.read()

    async def delete(self, path: str) -> None:
        if os.path.exists(path):
            os.remove(path)
