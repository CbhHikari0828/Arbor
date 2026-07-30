use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::domain::chat::ProviderChatMessage;

pub async fn insert_message(
    pool: &PgPool,
    branch_id: Uuid,
    role: &str,
    content: &str,
    model_id: Option<&str>,
    parent_message_id: Option<Uuid>,
) -> Result<Uuid, sqlx::Error> {
    let row = sqlx::query(
        r#"
        INSERT INTO discussion_messages (branch_id, role, content, model_id, parent_message_id)
        VALUES ($1, $2::discussion_message_role, $3, $4, $5)
        RETURNING id
        "#,
    )
    .bind(branch_id)
    .bind(role)
    .bind(content)
    .bind(model_id)
    .bind(parent_message_id)
    .fetch_one(pool)
    .await?;

    Ok(row.get("id"))
}

pub async fn list_provider_messages(
    pool: &PgPool,
    branch_id: Uuid,
    limit: i64,
) -> Result<Vec<ProviderChatMessage>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT role::text AS role, content
        FROM (
            SELECT id, role, content, created_at, parent_message_id
            FROM discussion_messages
            WHERE branch_id = $1
            ORDER BY created_at DESC, parent_message_id NULLS LAST, id DESC
            LIMIT $2
        ) recent_messages
        ORDER BY created_at ASC, parent_message_id NULLS FIRST, id ASC
        "#,
    )
    .bind(branch_id)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| ProviderChatMessage {
            role: row.get("role"),
            content: row.get("content"),
        })
        .collect())
}

pub async fn list_inherited_provider_messages(
    pool: &PgPool,
    branch_id: Uuid,
    limit: i64,
) -> Result<Vec<ProviderChatMessage>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        WITH RECURSIVE ancestors AS (
            SELECT n.id, n.parent_id, 0 AS depth
            FROM discussion_branches b
            JOIN knowledge_nodes n ON n.id = b.node_id
            WHERE b.id = $1
            UNION ALL
            SELECT parent.id, parent.parent_id, ancestors.depth + 1
            FROM knowledge_nodes parent
            JOIN ancestors ON parent.id = ancestors.parent_id
        ), inherited_messages AS (
            SELECT m.role::text AS role, m.content, m.created_at, ancestors.depth
            FROM ancestors
            JOIN discussion_branches b ON b.node_id = ancestors.id AND b.is_active = TRUE
            JOIN discussion_messages m ON m.branch_id = b.id
            WHERE ancestors.depth > 0
            ORDER BY ancestors.depth DESC, m.created_at ASC, m.id ASC
            LIMIT $2
        )
        SELECT role, content FROM inherited_messages
        ORDER BY depth DESC, created_at ASC
        "#,
    )
    .bind(branch_id)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(|row| ProviderChatMessage { role: row.get("role"), content: row.get("content") }).collect())
}
