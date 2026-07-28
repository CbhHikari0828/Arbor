use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::routing::{get, patch};
use axum::{Json, Router};
use uuid::Uuid;

use crate::domain::model_config::{
    AiModelConfig, CreateAiModelConfigRequest, UpdateAiModelConfigRequest,
};
use crate::error::AppError;
use crate::services::model_config_service;
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/model-configs",
            get(list_model_configs).post(create_model_config),
        )
        .route(
            "/model-configs/{id}",
            patch(update_model_config).delete(delete_model_config),
        )
}

async fn list_model_configs(
    State(state): State<AppState>,
) -> Result<Json<Vec<AiModelConfig>>, AppError> {
    let configs = model_config_service::list_model_configs(&state.db).await?;

    Ok(Json(configs))
}

async fn create_model_config(
    State(state): State<AppState>,
    Json(payload): Json<CreateAiModelConfigRequest>,
) -> Result<(StatusCode, Json<AiModelConfig>), AppError> {
    let config =
        model_config_service::create_model_config(&state.db, payload, &state.config.app_secret)
            .await?;

    Ok((StatusCode::CREATED, Json(config)))
}

async fn update_model_config(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateAiModelConfigRequest>,
) -> Result<Json<AiModelConfig>, AppError> {
    let config =
        model_config_service::update_model_config(&state.db, id, payload, &state.config.app_secret)
            .await?;

    Ok(Json(config))
}

async fn delete_model_config(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    model_config_service::delete_model_config(&state.db, id).await?;

    Ok(StatusCode::NO_CONTENT)
}
