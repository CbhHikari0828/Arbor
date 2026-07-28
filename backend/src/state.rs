use std::sync::Arc;

use reqwest::Client;
use sqlx::PgPool;

use crate::config::AppConfig;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub db: PgPool,
    pub http_client: Client,
}

impl AppState {
    pub fn new(config: AppConfig, db: PgPool) -> Self {
        Self {
            config: Arc::new(config),
            db,
            http_client: Client::new(),
        }
    }
}
