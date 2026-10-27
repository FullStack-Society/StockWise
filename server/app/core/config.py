from pydantic import EmailStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "StockWise API"
    app_env: str = "development"
    app_port: int = 8000
    client_url: str = "http://localhost:3000"
    database_url: str
    internal_api_key: str | None = None
    owner_name: str = "StockWise Owner"
    owner_email: EmailStr | None = None
    owner_password: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()
