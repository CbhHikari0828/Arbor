use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::model_config::{
    AiModelConfig, CreateAiModelConfigRequest, UpdateAiModelConfigRequest,
};
use crate::error::AppError;
use crate::repositories::model_config_repository;

pub async fn list_model_configs(pool: &PgPool) -> Result<Vec<AiModelConfig>, AppError> {
    Ok(model_config_repository::list_model_configs(pool).await?)
}

pub async fn create_model_config(
    pool: &PgPool,
    input: CreateAiModelConfigRequest,
    app_secret: &str,
) -> Result<AiModelConfig, AppError> {
    validate_required("provider", &input.provider)?;
    validate_url(&input.base_url)?;
    validate_required("modelName", &input.model_name)?;
    validate_required("apiKey", &input.api_key)?;

    Ok(model_config_repository::create_model_config(pool, &input, app_secret).await?)
}

pub async fn update_model_config(
    pool: &PgPool,
    id: Uuid,
    input: UpdateAiModelConfigRequest,
    app_secret: &str,
) -> Result<AiModelConfig, AppError> {
    if let Some(provider) = &input.provider {
        validate_required("provider", provider)?;
    }

    if let Some(base_url) = &input.base_url {
        validate_url(base_url)?;
    }

    if let Some(model_name) = &input.model_name {
        validate_required("modelName", model_name)?;
    }

    if let Some(api_key) = &input.api_key {
        validate_required("apiKey", api_key)?;
    }

    model_config_repository::update_model_config(pool, id, &input, app_secret)
        .await?
        .ok_or(AppError::NotFound("model_config_not_found"))
}

pub async fn delete_model_config(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
    if model_config_repository::delete_model_config(pool, id).await? {
        Ok(())
    } else {
        Err(AppError::NotFound("model_config_not_found"))
    }
}

fn validate_required(field: &'static str, value: &str) -> Result<(), AppError> {
    if value.trim().is_empty() {
        Err(AppError::BadRequest(field))
    } else {
        Ok(())
    }
}

fn validate_url(value: &str) -> Result<(), AppError> {
    let trimmed = value.trim();

    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        Ok(())
    } else {
        Err(AppError::BadRequest("baseUrl"))
    }
}
