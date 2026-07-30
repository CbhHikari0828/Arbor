use std::convert::Infallible;

use async_stream::stream;
use axum::response::sse::Event;
use futures_util::Stream;
use futures_util::StreamExt;
use serde::Serialize;
use uuid::Uuid;

use crate::domain::chat::{ChatDoneEvent, ChatErrorEvent, ChatTokenEvent, StreamChatRequest};
use crate::domain::model_config::DecryptedAiModelConfig;
use crate::repositories::{chat_repository, model_config_repository};
use crate::services::openai_compatible_provider;
use crate::state::AppState;

pub fn stream_branch_chat(
    state: AppState,
    branch_id: Uuid,
    request: StreamChatRequest,
) -> impl Stream<Item = Result<Event, Infallible>> {
    stream! {
        let content = request.content.trim().to_string();
        if content.is_empty() {
            yield Ok(sse_event("error", &ChatErrorEvent {
                message: "message content is required".to_string(),
            }));
            return;
        }

        let model_config = match model_config_repository::get_decrypted_model_config(
            &state.db,
            request.model_config_id,
            state.config.app_secret.as_str(),
        )
        .await
        {
            Ok(Some(model_config)) => model_config,
            Ok(None) => {
                yield Ok(sse_event("error", &ChatErrorEvent {
                    message: "model config not found or disabled".to_string(),
                }));
                return;
            }
            Err(error) => {
                yield Ok(sse_event("error", &ChatErrorEvent {
                    message: error.to_string(),
                }));
                return;
            }
        };

        if let Err(error) = ensure_openai_compatible(&model_config) {
            yield Ok(sse_event("error", &ChatErrorEvent {
                message: error.to_string(),
            }));
            return;
        }

        let user_message_id = match chat_repository::insert_message(&state.db, branch_id, "user", &content, None, None).await {
            Ok(message_id) => message_id,
            Err(error) => {
                yield Ok(sse_event("error", &ChatErrorEvent {
                    message: error.to_string(),
                }));
                return;
            }
        };
        let inherited_messages = match chat_repository::list_inherited_provider_messages(&state.db, branch_id, 16).await {
            Ok(messages) => messages,
            Err(error) => {
                yield Ok(sse_event("error", &ChatErrorEvent {
                    message: error.to_string(),
                }));
                return;
            }
        };
        let current_messages = match chat_repository::list_provider_messages(&state.db, branch_id, 24).await {
            Ok(messages) => messages,
            Err(error) => { yield Ok(sse_event("error", &ChatErrorEvent { message: error.to_string() })); return; }
        };
        let mut messages = Vec::new();
        if !inherited_messages.is_empty() {
            messages.push(crate::domain::chat::ProviderChatMessage { role: "system".to_string(), content: "The following messages are inherited context from the parent knowledge nodes. Use them as background for the current child-node discussion.".to_string() });
            messages.extend(inherited_messages);
        }
        messages.extend(current_messages);
        let model_config_id = model_config.id;
        let mut assistant_content = String::new();
        let provider_stream = openai_compatible_provider::stream_chat(
            state.http_client.clone(),
            model_config,
            messages,
        );
        futures_util::pin_mut!(provider_stream);

        while let Some(delta_result) = provider_stream.next().await {
            match delta_result {
                Ok(delta) => {
                    assistant_content.push_str(&delta);
                    yield Ok(sse_event("token", &ChatTokenEvent { delta }));
                }
                Err(error) => {
                    yield Ok(sse_event("error", &ChatErrorEvent {
                        message: error.to_string(),
                    }));
                    return;
                }
            }
        }

        let model_id = model_config_id.to_string();
        let assistant_message_id = match chat_repository::insert_message(
            &state.db,
            branch_id,
            "assistant",
            &assistant_content,
            Some(model_id.as_str()),
            Some(user_message_id),
        )
        .await
        {
            Ok(message_id) => message_id,
            Err(error) => {
                yield Ok(sse_event("error", &ChatErrorEvent {
                    message: error.to_string(),
                }));
                return;
            }
        };

        yield Ok(sse_event(
            "done",
            &ChatDoneEvent {
                user_message_id,
                assistant_message_id,
            },
        ));
    }
}

fn ensure_openai_compatible(config: &DecryptedAiModelConfig) -> anyhow::Result<()> {
    let provider = config.provider.to_ascii_lowercase();
    let supported = [
        "openai-compatible",
        "openai",
        "deepseek",
        "openrouter",
        "xai",
        "grok",
        "siliconflow",
        "moonshot",
        "kimi",
        "vllm",
        "ollama",
    ];

    if supported.contains(&provider.as_str()) {
        Ok(())
    } else {
        anyhow::bail!("provider is not openai-compatible: {}", config.provider);
    }
}

fn sse_event<T: Serialize>(event: &'static str, payload: &T) -> Event {
    Event::default()
        .event(event)
        .data(serde_json::to_string(payload).unwrap_or_else(|_| "{}".to_string()))
}
