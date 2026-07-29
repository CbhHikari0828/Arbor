use sqlx::PgPool;
use uuid::Uuid;
use crate::domain::note::{CreateDiscussionNoteRequest, DiscussionNote};
use crate::error::AppError;
use crate::repositories::note_repository;

pub async fn list_notes(pool: &PgPool, branch_id: Option<Uuid>) -> Result<Vec<DiscussionNote>, AppError> { Ok(note_repository::list_notes(pool, branch_id).await?) }
pub async fn create_note(pool: &PgPool, input: CreateDiscussionNoteRequest) -> Result<DiscussionNote, AppError> {
    if input.title.trim().is_empty() { return Err(AppError::BadRequest("title")); }
    if input.content.trim().is_empty() { return Err(AppError::BadRequest("content")); }
    note_repository::create_note(pool, &input).await.map_err(|error| if matches!(error, sqlx::Error::RowNotFound) { AppError::NotFound("branch") } else { AppError::Database(error) })
}
pub async fn delete_note(pool: &PgPool, id: Uuid) -> Result<(), AppError> { if note_repository::delete_note(pool, id).await? { Ok(()) } else { Err(AppError::NotFound("note")) } }
