use chrono::{DateTime, Utc};
use sqlx::{PgPool, Postgres, Row, Transaction};
use uuid::Uuid;

use crate::domain::model_config::{
    AiModelConfig, CreateAiModelConfigRequest, DecryptedAiModelConfig, UpdateAiModelConfigRequest,
};

pub async fn list_model_configs(pool: &PgPool) -> Result<Vec<AiModelConfig>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT id, provider, base_url, model_name, display_name,
               octet_length(api_key_ciphertext) > 0 AS has_api_key,
               is_enabled, is_default, created_at, updated_at
        FROM ai_model_configs
        ORDER BY is_default DESC, created_at ASC, id ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(row_to_model_config).collect())
}

pub async fn create_model_config(
    pool: &PgPool,
    input: &CreateAiModelConfigRequest,
    app_secret: &str,
) -> Result<AiModelConfig, sqlx::Error> {
    let mut tx = pool.begin().await?;

    if input.is_default.unwrap_or(false) {
        clear_default(&mut tx).await?;
    }

    let display_name = input
        .display_name
        .as_deref()
        .unwrap_or(input.model_name.as_str());

    let row = sqlx::query(
        r#"
        INSERT INTO ai_model_configs (
            provider, base_url, model_name, display_name, api_key_ciphertext, is_default
        )
        VALUES (
            $1, $2, $3, $4, pgp_sym_encrypt($5, $6), $7
        )
        RETURNING id, provider, base_url, model_name, display_name,
                  octet_length(api_key_ciphertext) > 0 AS has_api_key,
                  is_enabled, is_default, created_at, updated_at
        "#,
    )
    .bind(input.provider.trim())
    .bind(input.base_url.trim())
    .bind(input.model_name.trim())
    .bind(display_name.trim())
    .bind(input.api_key.trim())
    .bind(app_secret)
    .bind(input.is_default.unwrap_or(false))
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(row_to_model_config(row))
}

pub async fn update_model_config(
    pool: &PgPool,
    id: Uuid,
    input: &UpdateAiModelConfigRequest,
    app_secret: &str,
) -> Result<Option<AiModelConfig>, sqlx::Error> {
    let mut tx = pool.begin().await?;

    if input.is_default == Some(true) {
        clear_default(&mut tx).await?;
    }

    let row = sqlx::query(
        r#"
        UPDATE ai_model_configs
        SET provider = COALESCE($2, provider),
            base_url = COALESCE($3, base_url),
            model_name = COALESCE($4, model_name),
            display_name = COALESCE($5, display_name),
            api_key_ciphertext = CASE
                WHEN $6::text IS NULL THEN api_key_ciphertext
                ELSE pgp_sym_encrypt($6, $7)
            END,
            is_enabled = COALESCE($8, is_enabled),
            is_default = COALESCE($9, is_default)
        WHERE id = $1
        RETURNING id, provider, base_url, model_name, display_name,
                  octet_length(api_key_ciphertext) > 0 AS has_api_key,
                  is_enabled, is_default, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(input.provider.as_deref().map(str::trim))
    .bind(input.base_url.as_deref().map(str::trim))
    .bind(input.model_name.as_deref().map(str::trim))
    .bind(input.display_name.as_deref().map(str::trim))
    .bind(input.api_key.as_deref().map(str::trim))
    .bind(app_secret)
    .bind(input.is_enabled)
    .bind(input.is_default)
    .fetch_optional(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(row.map(row_to_model_config))
}

pub async fn delete_model_config(pool: &PgPool, id: Uuid) -> Result<bool, sqlx::Error> {
    let result = sqlx::query("DELETE FROM ai_model_configs WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;

    Ok(result.rows_affected() > 0)
}

pub async fn get_decrypted_model_config(
    pool: &PgPool,
    id: Uuid,
    app_secret: &str,
) -> Result<Option<DecryptedAiModelConfig>, sqlx::Error> {
    let row = sqlx::query(
        r#"
        SELECT id, provider, base_url, model_name,
               pgp_sym_decrypt(api_key_ciphertext, $2) AS api_key
        FROM ai_model_configs
        WHERE id = $1
          AND is_enabled = TRUE
        "#,
    )
    .bind(id)
    .bind(app_secret)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|row| DecryptedAiModelConfig {
        id: row.get("id"),
        provider: row.get("provider"),
        base_url: row.get("base_url"),
        model_name: row.get("model_name"),
        api_key: row.get("api_key"),
    }))
}

async fn clear_default(tx: &mut Transaction<'_, Postgres>) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE ai_model_configs SET is_default = FALSE WHERE is_default = TRUE")
        .execute(&mut **tx)
        .await?;

    Ok(())
}

fn row_to_model_config(row: sqlx::postgres::PgRow) -> AiModelConfig {
    AiModelConfig {
        id: row.get("id"),
        provider: row.get("provider"),
        base_url: row.get("base_url"),
        model_name: row.get("model_name"),
        display_name: row.get("display_name"),
        has_api_key: row.get("has_api_key"),
        is_enabled: row.get("is_enabled"),
        is_default: row.get("is_default"),
        created_at: row.get::<DateTime<Utc>, _>("created_at"),
        updated_at: row.get::<DateTime<Utc>, _>("updated_at"),
    }
}
