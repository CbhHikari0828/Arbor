use axum::extract::{Path, State};
use axum::routing::{delete, get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::domain::knowledge::WorkspaceSnapshot;
use crate::error::AppError;
use crate::services::workspace_service;
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/workspace/snapshot", get(get_workspace_snapshot))
        .route("/nodes/root", post(create_root_node))
        .route("/nodes/{node_id}/children", post(create_child_node))
        .route("/nodes/{node_id}", delete(delete_node))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateNodeRequest { title: Option<String> }
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CreateRootNodeResponse { node: crate::domain::knowledge::KnowledgeNode, branch: crate::domain::knowledge::DiscussionBranch }
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CreateChildNodeResponse { node: crate::domain::knowledge::KnowledgeNode, branch: crate::domain::knowledge::DiscussionBranch, edge: crate::domain::knowledge::KnowledgeGraphEdge }
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DeleteNodeResponse { deleted_node_ids: Vec<Uuid> }

async fn get_workspace_snapshot(
    State(state): State<AppState>,
) -> Result<Json<WorkspaceSnapshot>, AppError> {
    let snapshot = workspace_service::load_workspace_snapshot(&state.db).await?;

    Ok(Json(snapshot))
}

async fn create_root_node(State(state): State<AppState>, Json(payload): Json<CreateNodeRequest>) -> Result<Json<CreateRootNodeResponse>, AppError> {
    let title = payload.title.unwrap_or_default();
    let title = title.trim();
    if title.is_empty() { return Err(AppError::BadRequest("title is required")); }
    let (node, branch) = workspace_service::create_root_node(&state.db, title).await?;
    Ok(Json(CreateRootNodeResponse { node, branch }))
}

async fn create_child_node(State(state): State<AppState>, Path(node_id): Path<Uuid>, Json(payload): Json<CreateNodeRequest>) -> Result<Json<CreateChildNodeResponse>, AppError> {
    let title = payload.title.unwrap_or_else(|| "New node".to_owned());
    let (node, branch, edge) = workspace_service::create_child_node(&state.db, node_id, title.trim()).await.map_err(|error| if matches!(error, sqlx::Error::RowNotFound) { AppError::NotFound("parent node") } else { AppError::Database(error) })?;
    Ok(Json(CreateChildNodeResponse { node, branch, edge }))
}

async fn delete_node(State(state): State<AppState>, Path(node_id): Path<Uuid>) -> Result<Json<DeleteNodeResponse>, AppError> {
    let deleted_node_ids = workspace_service::delete_node(&state.db, node_id).await?;
    if deleted_node_ids.is_empty() { return Err(AppError::NotFound("node")); }
    Ok(Json(DeleteNodeResponse { deleted_node_ids }))
}
