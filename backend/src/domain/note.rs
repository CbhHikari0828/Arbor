use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscussionNote {
    pub id: Uuid,
    pub branch_id: Uuid,
    pub message_id: Option<Uuid>,
    pub title: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDiscussionNoteRequest {
    pub branch_id: Uuid,
    pub message_id: Option<Uuid>,
    pub title: String,
    pub content: String,
}
