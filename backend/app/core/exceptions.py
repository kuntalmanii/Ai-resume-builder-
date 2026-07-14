"""Core application exceptions handling."""
from typing import Any

class CareerOSException(Exception):
    """Base exception for CareerOS AI errors."""
    def __init__(self, message: str, code: str = "INTERNAL_SERVER_ERROR", details: Any = None):
        self.message = message
        self.code = code
        self.details = details
        super().__init__(message)

class ResourceNotFoundError(CareerOSException):
    """Exceptions raised when a resource is not found."""
    def __init__(self, message: str, details: Any = None):
        super().__init__(message, code="RESOURCE_NOT_FOUND", details=details)

class ConflictError(CareerOSException):
    """Exceptions raised when there is a state conflict (e.g. duplicate email)."""
    def __init__(self, message: str, details: Any = None):
        super().__init__(message, code="CONFLICT_ERROR", details=details)

class ValidationError(CareerOSException):
    """Exceptions raised on invalid input schema validation."""
    def __init__(self, message: str, details: Any = None):
        super().__init__(message, code="VALIDATION_ERROR", details=details)

class UnauthorizedError(CareerOSException):
    """Exceptions raised on token / authentication verification failures."""
    def __init__(self, message: str, details: Any = None):
        super().__init__(message, code="UNAUTHORIZED", details=details)

class ForbiddenError(CareerOSException):
    """Exceptions raised on access privilege / forbidden checks."""
    def __init__(self, message: str, details: Any = None):
        super().__init__(message, code="FORBIDDEN", details=details)

class FileTooLargeError(ValidationError):
    """Exceptions raised when an uploaded file is larger than the limit."""
    def __init__(self, message: str, max_size_mb: int):
        super().__init__(message, details={"max_size_mb": max_size_mb})
        self.code = "FILE_TOO_LARGE"

