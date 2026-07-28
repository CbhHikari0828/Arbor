use async_stream::stream;
use futures_util::Stream;
use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::domain::chat::ProviderChatMessage;
use crate::domain::model_config::DecryptedAiModelConfig;

#[derive(Debug, Serialize)]
struct OpenAiCompatibleRequest<'a> {
    model: &'a str,
    messages: Vec<OpenAiCompatibleMessage<'a>>,
    stream: bool,
}

#[derive(Debug, Serialize)]
struct OpenAiCompatibleMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Debug, Deserialize)]
struct OpenAiCompatibleChunk {
    choices: Vec<OpenAiCompatibleChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenAiCompatibleChoice {
    delta: OpenAiCompatibleDelta,
}

#[derive(Debug, Deserialize)]
struct OpenAiCompatibleDelta {
    content: Option<String>,
}

pub fn stream_chat(
    client: Client,
    config: DecryptedAiModelConfig,
    messages: Vec<ProviderChatMessage>,
) -> impl Stream<Item = anyhow::Result<String>> {
    stream! {
        let url = format!("{}/chat/completions", config.base_url.trim_end_matches('/'));
        let request_messages = messages
            .iter()
            .map(|message| OpenAiCompatibleMessage {
                role: message.role.as_str(),
                content: message.content.as_str(),
            })
            .collect::<Vec<_>>();
        let body = OpenAiCompatibleRequest {
            model: config.model_name.as_str(),
            messages: request_messages,
            stream: true,
        };
        let response = match client
            .post(url)
            .bearer_auth(config.api_key.as_str())
            .json(&body)
            .send()
            .await
        {
            Ok(response) => response,
            Err(error) => {
                yield Err(error.into());
                return;
            }
        };
        let status = response.status();

        if !status.is_success() {
            let error_body = response.text().await.unwrap_or_default();
            yield Err(anyhow::anyhow!("provider returned {status}: {error_body}"));
            return;
        }

        let mut stream = response.bytes_stream();
        let mut line_buffer = String::new();

        while let Some(chunk) = stream.next().await {
            let chunk = match chunk {
                Ok(chunk) => chunk,
                Err(error) => {
                    yield Err(error.into());
                    return;
                }
            };
            let chunk_text = match std::str::from_utf8(&chunk) {
                Ok(chunk_text) => chunk_text,
                Err(error) => {
                    yield Err(error.into());
                    return;
                }
            };
            line_buffer.push_str(chunk_text);

            while let Some(newline_index) = line_buffer.find('\n') {
                let raw_line = line_buffer[..newline_index].trim_end_matches('\r').to_string();
                line_buffer.drain(..=newline_index);
                let Some(data) = raw_line.strip_prefix("data:") else {
                    continue;
                };
                let data = data.trim();

                if data == "[DONE]" {
                    return;
                }

                let chunk = match serde_json::from_str::<OpenAiCompatibleChunk>(data) {
                    Ok(chunk) => chunk,
                    Err(error) => {
                        yield Err(error.into());
                        return;
                    }
                };
                for choice in chunk.choices {
                    if let Some(delta) = choice.delta.content {
                        if !delta.is_empty() {
                            yield Ok(delta);
                        }
                    }
                }
            }
        }
    }
}
