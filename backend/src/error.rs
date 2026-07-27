use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;
use thiserror::Error;
use tracing::error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("database error")]
    Database(#[from] sqlx::Error),
}

#[derive(Serialize)]
struct ErrorResponse {
    error: &'static str,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        error!(error = %self, "request failed");

        let status = match self {
            AppError::Database(_) => StatusCode::SERVICE_UNAVAILABLE,
        };

        (
            status,
            Json(ErrorResponse {
                error: "request_failed",
            }),
        )
            .into_response()
    }
}
