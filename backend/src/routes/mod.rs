mod chat;
mod health;
mod model_configs;
mod workspace;

use axum::Router;

use crate::state::AppState;

pub fn router(state: AppState) -> Router {
    Router::new()
        .nest(
            "/api",
            Router::new()
                .merge(chat::router())
                .merge(health::router())
                .merge(model_configs::router())
                .merge(workspace::router()),
        )
        .with_state(state)
}
