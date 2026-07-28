use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeNode {
    pub id: Uuid,
    pub parent_id: Option<Uuid>,
    pub title: String,
    pub description: String,
    pub tags: Vec<String>,
    pub status: String,
    pub position: KnowledgeNodePosition,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct KnowledgeNodePosition {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeGraphEdge {
    pub id: Uuid,
    pub source: Uuid,
    pub target: Uuid,
    pub label: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscussionMessage {
    pub id: Uuid,
    pub role: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscussionBranch {
    pub id: Uuid,
    pub node_id: Uuid,
    pub title: String,
    pub is_active: bool,
    pub created_from_message_id: Option<Uuid>,
    pub messages: Vec<DiscussionMessage>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeSummary {
    pub id: Uuid,
    pub node_id: Uuid,
    pub thesis: String,
    pub bullets: Vec<String>,
    pub open_questions: Vec<String>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct WorkspaceSnapshot {
    pub nodes: Vec<KnowledgeNode>,
    pub edges: Vec<KnowledgeGraphEdge>,
    pub branches: Vec<DiscussionBranch>,
    pub summaries: Vec<KnowledgeSummary>,
}
