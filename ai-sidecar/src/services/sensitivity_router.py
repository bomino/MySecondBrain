class SensitivityRouter:
    def __init__(self, mode: str = "hybrid"):
        self.mode = mode

    def get_provider(self, is_sensitive: bool, mode_override: str | None = None) -> str:
        mode = mode_override or self.mode
        if mode == "local":
            return "local"
        if mode == "cloud":
            return "cloud"
        return "local" if is_sensitive else "cloud"
