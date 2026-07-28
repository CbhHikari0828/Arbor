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
    #[error("bad request: {0}")]
    BadRequest(&'static str),
    #[error("not found: {0}")]
    NotFound(&'static str),
}

#[derive(Serialize)]
struct ErrorResponse {
    error: &'static str,
    detail: Option<&'static str>,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        error!(error = %self, "request failed");

        let status = match self {
            AppError::Database(_) => StatusCode::SERVICE_UNAVAILABLE,
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST,
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
        };

        let detail = match self {
            AppError::BadRequest(detail) | AppError::NotFound(detail) => Some(detail),
            AppError::Database(_) => None,
        };

        (
            status,
            Json(ErrorResponse {
                error: "request_failed",
                detail,
            }),
        )
            .into_response()
    }
}
