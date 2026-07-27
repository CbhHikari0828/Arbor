mod health;

use axum::Router;

use crate::state::AppState;

pub fn router(state: AppState) -> Router {
    Router::new()
        .nest("/api", Router::new().merge(health::router()))
        .with_state(state)
}
