class SensitivityRouter:
    def __init__(self, mode: str = "hybrid"):
        self.mode = mode

    def get_provider(self, is_sensitive: bool) -> str:
        if self.mode == "local":
            return "local"
        if self.mode == "cloud":
            return "cloud"
        return "local" if is_sensitive else "cloud"
