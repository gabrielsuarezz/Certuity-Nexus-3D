from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime config. The single switch `use_mock_llm` lets the whole app run
    with no API keys (for building + offline demos)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    use_mock_llm: bool = True

    azure_openai_endpoint: str = ""
    azure_openai_api_key: str = ""
    azure_openai_deployment: str = "gpt-4o"
    azure_openai_api_version: str = "2024-10-21"

    azure_content_safety_endpoint: str = ""
    azure_content_safety_key: str = ""

    elevenlabs_api_key: str = ""
    elevenlabs_agent_id: str = ""

    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    demo_client_id: str = "a0R8d00000Smith1"
    audit_log_path: str = "audit.log.jsonl"

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def azure_openai_ready(self) -> bool:
        return bool(self.azure_openai_endpoint and self.azure_openai_api_key)

    @property
    def content_safety_ready(self) -> bool:
        return bool(self.azure_content_safety_endpoint and self.azure_content_safety_key)


settings = Settings()
