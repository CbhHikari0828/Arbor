use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::routing::get;
use axum::{Json, Router};
use serde::Deserialize;
use uuid::Uuid;
use crate::domain::note::{CreateDiscussionNoteRequest, DiscussionNote};
use crate::error::AppError;
use crate::services::note_service;
use crate::state::AppState;

#[derive(Deserialize)]
struct NoteQuery { #[serde(rename = "branchId")] branch_id: Option<Uuid> }
pub fn router() -> Router<AppState> { Router::new().route("/notes", get(list_notes).post(create_note)).route("/notes/{id}", axum::routing::delete(delete_note)) }
async fn list_notes(State(state): State<AppState>, Query(query): Query<NoteQuery>) -> Result<Json<Vec<DiscussionNote>>, AppError> { Ok(Json(note_service::list_notes(&state.db, query.branch_id).await?)) }
async fn create_note(State(state): State<AppState>, Json(input): Json<CreateDiscussionNoteRequest>) -> Result<(StatusCode, Json<DiscussionNote>), AppError> { Ok((StatusCode::CREATED, Json(note_service::create_note(&state.db, input).await?))) }
async fn delete_note(State(state): State<AppState>, Path(id): Path<Uuid>) -> Result<StatusCode, AppError> { note_service::delete_note(&state.db, id).await?; Ok(StatusCode::NO_CONTENT) }
