use axum::extract::{Path, State};
use axum::response::sse::{KeepAlive, Sse};
use axum::routing::post;
use axum::{Json, Router};
use uuid::Uuid;

use crate::domain::chat::StreamChatRequest;
use crate::services::chat_service;
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route("/branches/{branch_id}/stream", post(stream_branch_chat))
}

async fn stream_branch_chat(
    State(state): State<AppState>,
    Path(branch_id): Path<Uuid>,
    Json(payload): Json<StreamChatRequest>,
) -> Sse<
    impl futures_util::Stream<Item = Result<axum::response::sse::Event, std::convert::Infallible>>,
> {
    Sse::new(chat_service::stream_branch_chat(state, branch_id, payload))
        .keep_alive(KeepAlive::default())
}
