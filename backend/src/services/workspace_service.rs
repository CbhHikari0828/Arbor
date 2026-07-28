use sqlx::PgPool;

use crate::domain::knowledge::WorkspaceSnapshot;
use crate::repositories::workspace_repository;
use crate::domain::knowledge::{DiscussionBranch, KnowledgeGraphEdge, KnowledgeNode};
use uuid::Uuid;

pub async fn load_workspace_snapshot(pool: &PgPool) -> Result<WorkspaceSnapshot, sqlx::Error> {
    workspace_repository::load_workspace_snapshot(pool).await
}

pub async fn create_root_node(pool: &PgPool, title: &str) -> Result<(KnowledgeNode, DiscussionBranch), sqlx::Error> { workspace_repository::create_root_node(pool, title).await }
pub async fn create_child_node(pool: &PgPool, parent_id: Uuid, title: &str) -> Result<(KnowledgeNode, DiscussionBranch, KnowledgeGraphEdge), sqlx::Error> { workspace_repository::create_child_node(pool, parent_id, title).await }
pub async fn delete_node(pool: &PgPool, node_id: Uuid) -> Result<Vec<Uuid>, sqlx::Error> { workspace_repository::delete_node(pool, node_id).await }
