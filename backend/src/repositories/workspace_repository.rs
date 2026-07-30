use std::collections::HashMap;

use chrono::{DateTime, Utc};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::domain::knowledge::{
    DiscussionBranch, DiscussionMessage, KnowledgeGraphEdge, KnowledgeNode, KnowledgeNodePosition,
    KnowledgeSummary, WorkspaceSnapshot,
    DeletedKnowledgeNode,
};

pub async fn load_workspace_snapshot(pool: &PgPool) -> Result<WorkspaceSnapshot, sqlx::Error> {
    let nodes = load_nodes(pool).await?;
    let edges = load_edges(pool).await?;
    let mut branches = load_branches(pool).await?;
    let messages = load_messages(pool).await?;
    let summaries = load_summaries(pool).await?;

    let mut messages_by_branch: HashMap<Uuid, Vec<DiscussionMessage>> = HashMap::new();
    for message in messages {
        messages_by_branch
            .entry(message.branch_id)
            .or_default()
            .push(message.into_domain());
    }

    for branch in &mut branches {
        branch.messages = messages_by_branch.remove(&branch.id).unwrap_or_default();
    }

    Ok(WorkspaceSnapshot {
        nodes,
        edges,
        branches,
        summaries,
    })
}

pub async fn create_root_node(pool: &PgPool, title: &str) -> Result<(KnowledgeNode, DiscussionBranch), sqlx::Error> {
    let mut transaction = pool.begin().await?;
    let node = sqlx::query(
        "INSERT INTO knowledge_nodes (title, description, tags, position_x, position_y) VALUES ($1, $2, $3, 0, 150) RETURNING id, parent_id, title, description, tags, status::text AS status, position_x, position_y, updated_at",
    )
    .bind(title)
    .bind("")
    .bind(vec!["root".to_owned()])
    .fetch_one(&mut *transaction)
    .await?;
    let node = row_to_node(node);
    let branch = sqlx::query("INSERT INTO discussion_branches (node_id, title) VALUES ($1, $2) RETURNING id, node_id, title, is_active, created_from_message_id")
        .bind(node.id)
        .bind("New node discussion")
        .fetch_one(&mut *transaction)
        .await?;
    transaction.commit().await?;
    Ok((node, row_to_branch(branch)))
}

pub async fn create_child_node(pool: &PgPool, parent_id: Uuid, title: &str) -> Result<(KnowledgeNode, DiscussionBranch, KnowledgeGraphEdge), sqlx::Error> {
    let mut transaction = pool.begin().await?;
    // Lock the parent so concurrent child creation receives distinct sequence numbers.
    let parent = sqlx::query("SELECT position_x, position_y FROM knowledge_nodes WHERE id = $1 AND deleted_at IS NULL FOR UPDATE")
        .bind(parent_id).fetch_optional(&mut *transaction).await?;
    let Some(parent) = parent else { return Err(sqlx::Error::RowNotFound); };
    let sibling_count: i64 = sqlx::query_scalar("SELECT count(*) FROM knowledge_nodes WHERE parent_id = $1")
        .bind(parent_id).fetch_one(&mut *transaction).await?;
    let title = match title.trim() {
        "" | "New node" | "新节点" => format!("子节点 {}", sibling_count + 1),
        title => title.to_owned(),
    };
    let node = sqlx::query("INSERT INTO knowledge_nodes (parent_id, title, description, tags, position_x, position_y) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, parent_id, title, description, tags, status::text AS status, position_x, position_y, updated_at")
        .bind(parent_id).bind(title).bind("").bind(vec!["child".to_owned()])
        .bind(parent.get::<f64, _>("position_x") + 440.0).bind(parent.get::<f64, _>("position_y") + sibling_count as f64 * 220.0)
        .fetch_one(&mut *transaction).await?;
    let node = row_to_node(node);
    let edge = sqlx::query("INSERT INTO knowledge_edges (source_id, target_id, label) VALUES ($1, $2, '展开') RETURNING id, source_id, target_id, label")
        .bind(parent_id).bind(node.id).fetch_one(&mut *transaction).await?;
    let branch = sqlx::query("INSERT INTO discussion_branches (node_id, title) VALUES ($1, $2) RETURNING id, node_id, title, is_active, created_from_message_id")
        .bind(node.id).bind("New node discussion").fetch_one(&mut *transaction).await?;
    transaction.commit().await?;
    Ok((node, row_to_branch(branch), KnowledgeGraphEdge { id: edge.get("id"), source: edge.get("source_id"), target: edge.get("target_id"), label: edge.get("label") }))
}

pub async fn delete_node(pool: &PgPool, node_id: Uuid) -> Result<Vec<Uuid>, sqlx::Error> {
    let result = sqlx::query("WITH RECURSIVE descendants AS (SELECT id FROM knowledge_nodes WHERE id = $1 AND deleted_at IS NULL UNION ALL SELECT n.id FROM knowledge_nodes n JOIN descendants d ON n.parent_id = d.id WHERE n.deleted_at IS NULL), changed AS (UPDATE knowledge_nodes SET deleted_at = now() WHERE id IN (SELECT id FROM descendants) RETURNING id) SELECT id FROM changed")
        .bind(node_id).fetch_all(pool).await?;
    Ok(result.into_iter().map(|row| row.get("id")).collect())
}

pub async fn set_node_favorite(pool: &PgPool, node_id: Uuid, is_favorite: bool) -> Result<bool, sqlx::Error> {
    Ok(sqlx::query("UPDATE knowledge_nodes SET is_favorite = $2 WHERE id = $1 AND deleted_at IS NULL").bind(node_id).bind(is_favorite).execute(pool).await?.rows_affected() == 1)
}

pub async fn update_node_description(pool: &PgPool, node_id: Uuid, description: &str) -> Result<bool, sqlx::Error> {
    Ok(sqlx::query("UPDATE knowledge_nodes SET description = $2 WHERE id = $1 AND deleted_at IS NULL").bind(node_id).bind(description).execute(pool).await?.rows_affected() == 1)
}

pub async fn list_favorite_node_ids(pool: &PgPool) -> Result<Vec<Uuid>, sqlx::Error> {
    Ok(sqlx::query_scalar("SELECT id FROM knowledge_nodes WHERE deleted_at IS NULL AND is_favorite = TRUE ORDER BY updated_at DESC").fetch_all(pool).await?)
}

pub async fn list_deleted_nodes(pool: &PgPool) -> Result<Vec<DeletedKnowledgeNode>, sqlx::Error> {
    let rows = sqlx::query("SELECT n.id, n.title, p.title AS parent_title, n.description, n.tags, n.deleted_at FROM knowledge_nodes n LEFT JOIN knowledge_nodes p ON p.id = n.parent_id WHERE n.deleted_at IS NOT NULL ORDER BY n.deleted_at DESC")
        .fetch_all(pool).await?;
    Ok(rows.into_iter().map(|row| DeletedKnowledgeNode { id: row.get("id"), title: row.get("title"), parent_title: row.get("parent_title"), description: row.get("description"), tags: row.get("tags"), deleted_at: row.get("deleted_at") }).collect())
}

pub async fn restore_node(pool: &PgPool, node_id: Uuid) -> Result<bool, sqlx::Error> {
    Ok(sqlx::query("WITH RECURSIVE descendants AS (SELECT id FROM knowledge_nodes WHERE id = $1 AND deleted_at IS NOT NULL UNION ALL SELECT n.id FROM knowledge_nodes n JOIN descendants d ON n.parent_id = d.id WHERE n.deleted_at IS NOT NULL) UPDATE knowledge_nodes SET deleted_at = NULL WHERE id IN (SELECT id FROM descendants)").bind(node_id).execute(pool).await?.rows_affected() > 0)
}

pub async fn permanently_delete_node(pool: &PgPool, node_id: Uuid) -> Result<bool, sqlx::Error> {
    Ok(sqlx::query("DELETE FROM knowledge_nodes WHERE id = $1 AND deleted_at IS NOT NULL").bind(node_id).execute(pool).await?.rows_affected() == 1)
}

fn row_to_node(row: sqlx::postgres::PgRow) -> KnowledgeNode {
    KnowledgeNode { id: row.get("id"), parent_id: row.get("parent_id"), title: row.get("title"), description: row.get("description"), tags: row.get("tags"), status: row.get("status"), position: KnowledgeNodePosition { x: row.get("position_x"), y: row.get("position_y") }, updated_at: row.get("updated_at") }
}

fn row_to_branch(row: sqlx::postgres::PgRow) -> DiscussionBranch {
    DiscussionBranch { id: row.get("id"), node_id: row.get("node_id"), title: row.get("title"), is_active: row.get("is_active"), created_from_message_id: row.get("created_from_message_id"), messages: Vec::new() }
}

async fn load_nodes(pool: &PgPool) -> Result<Vec<KnowledgeNode>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT id, parent_id, title, description, tags, status::text AS status,
               position_x, position_y, updated_at
        FROM knowledge_nodes
        WHERE deleted_at IS NULL
        ORDER BY parent_id NULLS FIRST, created_at ASC, id ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| KnowledgeNode {
            id: row.get("id"),
            parent_id: row.get("parent_id"),
            title: row.get("title"),
            description: row.get("description"),
            tags: row.get("tags"),
            status: row.get("status"),
            position: KnowledgeNodePosition {
                x: row.get("position_x"),
                y: row.get("position_y"),
            },
            updated_at: row.get("updated_at"),
        })
        .collect())
}

async fn load_edges(pool: &PgPool) -> Result<Vec<KnowledgeGraphEdge>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT e.id, e.source_id, e.target_id, e.label
        FROM knowledge_edges e
        JOIN knowledge_nodes source_node ON source_node.id = e.source_id
        JOIN knowledge_nodes target_node ON target_node.id = e.target_id
        WHERE source_node.deleted_at IS NULL
          AND target_node.deleted_at IS NULL
        ORDER BY e.created_at ASC, e.id ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| KnowledgeGraphEdge {
            id: row.get("id"),
            source: row.get("source_id"),
            target: row.get("target_id"),
            label: row.get("label"),
        })
        .collect())
}

async fn load_branches(pool: &PgPool) -> Result<Vec<DiscussionBranch>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT b.id, b.node_id, b.title, b.is_active, b.created_from_message_id
        FROM discussion_branches b
        JOIN knowledge_nodes n ON n.id = b.node_id
        WHERE n.deleted_at IS NULL
        ORDER BY b.created_at ASC, b.id ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| DiscussionBranch {
            id: row.get("id"),
            node_id: row.get("node_id"),
            title: row.get("title"),
            is_active: row.get("is_active"),
            created_from_message_id: row.get("created_from_message_id"),
            messages: Vec::new(),
        })
        .collect())
}

struct MessageRecord {
    branch_id: Uuid,
    id: Uuid,
    role: String,
    content: String,
    created_at: DateTime<Utc>,
}

impl MessageRecord {
    fn into_domain(self) -> DiscussionMessage {
        DiscussionMessage {
            id: self.id,
            role: self.role,
            content: self.content,
            created_at: self.created_at,
        }
    }
}

async fn load_messages(pool: &PgPool) -> Result<Vec<MessageRecord>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT m.branch_id, m.id, m.role::text AS role, m.content, m.created_at
        FROM discussion_messages m
        JOIN discussion_branches b ON b.id = m.branch_id
        JOIN knowledge_nodes n ON n.id = b.node_id
        WHERE n.deleted_at IS NULL
        ORDER BY m.created_at ASC, m.parent_message_id NULLS FIRST, m.id ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| MessageRecord {
            branch_id: row.get("branch_id"),
            id: row.get("id"),
            role: row.get("role"),
            content: row.get("content"),
            created_at: row.get("created_at"),
        })
        .collect())
}

async fn load_summaries(pool: &PgPool) -> Result<Vec<KnowledgeSummary>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT s.id, s.node_id, s.thesis, s.bullets, s.open_questions, s.updated_at
        FROM knowledge_summaries s
        JOIN knowledge_nodes n ON n.id = s.node_id
        WHERE n.deleted_at IS NULL
        ORDER BY s.updated_at DESC, s.id ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| KnowledgeSummary {
            id: row.get("id"),
            node_id: row.get("node_id"),
            thesis: row.get("thesis"),
            bullets: row.get("bullets"),
            open_questions: row.get("open_questions"),
            updated_at: row.get("updated_at"),
        })
        .collect())
}
