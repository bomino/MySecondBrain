import pytest
from unittest.mock import AsyncMock, patch
from services.sensitivity_router import SensitivityRouter


def test_routes_sensitive_to_local():
    router = SensitivityRouter(mode="hybrid")
    provider = router.get_provider(is_sensitive=True)
    assert provider == "local"


def test_routes_non_sensitive_to_cloud():
    router = SensitivityRouter(mode="hybrid")
    provider = router.get_provider(is_sensitive=False)
    assert provider == "cloud"


def test_force_local_mode():
    router = SensitivityRouter(mode="local")
    assert router.get_provider(is_sensitive=False) == "local"
    assert router.get_provider(is_sensitive=True) == "local"


def test_force_cloud_mode():
    router = SensitivityRouter(mode="cloud")
    assert router.get_provider(is_sensitive=False) == "cloud"
    assert router.get_provider(is_sensitive=True) == "cloud"
