use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamChatRequest {
    pub model_config_id: Uuid,
    pub content: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatTokenEvent {
    pub delta: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatDoneEvent {
    pub user_message_id: Uuid,
    pub assistant_message_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct ChatErrorEvent {
    pub message: String,
}

#[derive(Debug)]
pub struct ProviderChatMessage {
    pub role: String,
    pub content: String,
}
