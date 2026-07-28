use std::env;

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub database_url: String,
    pub server_port: u16,
    pub frontend_origin: String,
    pub app_secret: String,
}

impl AppConfig {
    pub fn from_env() -> anyhow::Result<Self> {
        let database_url = env::var("DATABASE_URL")?;
        let server_port = env::var("SERVER_PORT")
            .unwrap_or_else(|_| "8080".to_string())
            .parse::<u16>()?;
        let frontend_origin =
            env::var("FRONTEND_ORIGIN").unwrap_or_else(|_| "http://localhost:5173".to_string());
        let app_secret = env::var("APP_SECRET")?;

        Ok(Self {
            database_url,
            server_port,
            frontend_origin,
            app_secret,
        })
    }
}
