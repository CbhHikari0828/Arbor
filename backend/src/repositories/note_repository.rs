use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::domain::note::{CreateDiscussionNoteRequest, DiscussionNote};

pub async fn list_notes(pool: &PgPool, branch_id: Option<Uuid>) -> Result<Vec<DiscussionNote>, sqlx::Error> {
    let rows = sqlx::query("SELECT id, branch_id, message_id, title, content, created_at FROM discussion_notes WHERE ($1::uuid IS NULL OR branch_id = $1) ORDER BY created_at DESC")
        .bind(branch_id).fetch_all(pool).await?;
    Ok(rows.into_iter().map(row_to_note).collect())
}

pub async fn create_note(pool: &PgPool, input: &CreateDiscussionNoteRequest) -> Result<DiscussionNote, sqlx::Error> {
    let row = sqlx::query("INSERT INTO discussion_notes (branch_id, message_id, title, content) SELECT $1, $2, $3, $4 WHERE EXISTS (SELECT 1 FROM discussion_branches WHERE id = $1) RETURNING id, branch_id, message_id, title, content, created_at")
        .bind(input.branch_id).bind(input.message_id).bind(input.title.trim()).bind(input.content.trim()).fetch_optional(pool).await?;
    row.map(row_to_note).ok_or(sqlx::Error::RowNotFound)
}

pub async fn delete_note(pool: &PgPool, id: Uuid) -> Result<bool, sqlx::Error> {
    Ok(sqlx::query("DELETE FROM discussion_notes WHERE id = $1").bind(id).execute(pool).await?.rows_affected() == 1)
}

fn row_to_note(row: sqlx::postgres::PgRow) -> DiscussionNote {
    DiscussionNote { id: row.get("id"), branch_id: row.get("branch_id"), message_id: row.get("message_id"), title: row.get("title"), content: row.get("content"), created_at: row.get("created_at") }
}
