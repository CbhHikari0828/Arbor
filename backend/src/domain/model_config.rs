use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiModelConfig {
    pub id: Uuid,
    pub provider: String,
    pub base_url: String,
    pub model_name: String,
    pub display_name: String,
    pub has_api_key: bool,
    pub is_enabled: bool,
    pub is_default: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug)]
pub struct DecryptedAiModelConfig {
    pub id: Uuid,
    pub provider: String,
    pub base_url: String,
    pub model_name: String,
    pub api_key: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAiModelConfigRequest {
    pub provider: String,
    pub base_url: String,
    pub model_name: String,
    pub display_name: Option<String>,
    pub api_key: String,
    pub is_default: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAiModelConfigRequest {
    pub provider: Option<String>,
    pub base_url: Option<String>,
    pub model_name: Option<String>,
    pub display_name: Option<String>,
    pub api_key: Option<String>,
    pub is_enabled: Option<bool>,
    pub is_default: Option<bool>,
}
