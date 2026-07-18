"""Storage provider factory.

Usage:
    from app.services.storage.storage_factory import get_storage

    storage = get_storage()
    path = await storage.save("my-file.pdf", pdf_bytes)
    data = await storage.read(path)
    await storage.delete(path)
"""

from __future__ import annotations

import logging

from app.core.config import get_settings
from app.services.storage.base import BaseStorage
from app.services.storage.local import LocalStorage

logger = logging.getLogger(__name__)


class _S3Storage(BaseStorage):
    """Amazon S3 (or S3-compatible) storage driver.

    Requires:
      - boto3 installed in requirements.txt
      - AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, STORAGE_BUCKET set.
    """

    def __init__(self) -> None:
        import boto3  # type: ignore[import]

        settings = get_settings()
        self._bucket = settings.STORAGE_BUCKET
        self._client = boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

    async def save(self, filename: str, data: bytes) -> str:
        import asyncio

        key = f"exports/{filename}"
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: self._client.put_object(Bucket=self._bucket, Key=key, Body=data),
        )
        return f"s3://{self._bucket}/{key}"

    async def read(self, path: str) -> bytes:
        import asyncio

        key = path.removeprefix(f"s3://{self._bucket}/")
        loop = asyncio.get_event_loop()
        resp = await loop.run_in_executor(
            None,
            lambda: self._client.get_object(Bucket=self._bucket, Key=key),
        )
        return resp["Body"].read()

    async def delete(self, path: str) -> None:
        import asyncio

        key = path.removeprefix(f"s3://{self._bucket}/")
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: self._client.delete_object(Bucket=self._bucket, Key=key),
        )


class _GCSStorage(BaseStorage):
    """Google Cloud Storage driver (stub — install google-cloud-storage to use)."""

    async def save(self, filename: str, data: bytes) -> str:
        raise NotImplementedError(
            "GCS storage driver not yet configured. Install google-cloud-storage."
        )

    async def read(self, path: str) -> bytes:
        raise NotImplementedError("GCS storage driver not yet configured.")

    async def delete(self, path: str) -> None:
        raise NotImplementedError("GCS storage driver not yet configured.")


class _AzureBlobStorage(BaseStorage):
    """Azure Blob Storage driver (stub — install azure-storage-blob to use)."""

    async def save(self, filename: str, data: bytes) -> str:
        raise NotImplementedError(
            "Azure Blob storage driver not yet configured. Install azure-storage-blob."
        )

    async def read(self, path: str) -> bytes:
        raise NotImplementedError("Azure Blob storage driver not yet configured.")

    async def delete(self, path: str) -> None:
        raise NotImplementedError("Azure Blob storage driver not yet configured.")


# ─── Factory ─────────────────────────────────────────────────────────────────

_storage_instance: BaseStorage | None = None


def get_storage() -> BaseStorage:
    """Resolve and return the configured storage driver singleton."""
    global _storage_instance  # noqa: PLW0603

    if _storage_instance is not None:
        return _storage_instance

    settings = get_settings()
    provider = settings.STORAGE_PROVIDER

    if provider == "local":
        _storage_instance = LocalStorage()
    elif provider == "s3":
        _storage_instance = _S3Storage()
    elif provider == "gcs":
        _storage_instance = _GCSStorage()
    elif provider == "azure":
        _storage_instance = _AzureBlobStorage()
    else:
        logger.warning("Unknown STORAGE_PROVIDER '%s' — falling back to local.", provider)
        _storage_instance = LocalStorage()

    logger.info("Storage: using '%s' provider.", provider)
    return _storage_instance
