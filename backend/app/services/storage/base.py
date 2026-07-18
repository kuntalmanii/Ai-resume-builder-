"""Abstract base class for storage services."""

from abc import ABC, abstractmethod


class BaseStorage(ABC):
    @abstractmethod
    async def save(self, filename: str, data: bytes) -> str:
        """Save raw bytes to a file destination.

        Args:
            filename: Name of the file (e.g. "uuid.pdf")
            data: Binary contents of the file

        Returns:
            The stored reference path/URL.
        """
        pass

    @abstractmethod
    async def read(self, path: str) -> bytes:
        """Read file bytes from stored reference path.

        Args:
            path: Stored reference path/URL

        Returns:
            Binary contents of the file.
        """
        pass

    @abstractmethod
    async def delete(self, path: str) -> None:
        """Delete file at stored reference path.

        Args:
            path: Stored reference path/URL
        """
        pass
