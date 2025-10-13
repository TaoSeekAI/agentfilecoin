use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::path::Path;

/// Lighthouse API client for Filecoin pinning
pub struct LighthouseClient {
    client: Client,
    api_key: String,
    base_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UploadResponse {
    pub data: UploadData,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UploadData {
    #[serde(rename = "Name")]
    pub name: String,
    #[serde(rename = "Hash")]
    pub hash: String,
    #[serde(rename = "Size")]
    pub size: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PinStatus {
    pub cid: String,
    pub status: String,
}

impl LighthouseClient {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            base_url: "https://node.lighthouse.storage".to_string(),
        }
    }

    /// Upload JSON data to Lighthouse and pin to Filecoin
    pub async fn upload_json(&self, data: &serde_json::Value) -> Result<String> {
        let json_str = serde_json::to_string(data)?;
        let json_bytes = json_str.as_bytes();

        let form = reqwest::multipart::Form::new()
            .part(
                "file",
                reqwest::multipart::Part::bytes(json_bytes.to_vec())
                    .file_name("data.json")
                    .mime_str("application/json")?,
            );

        let response = self
            .client
            .post(&format!("{}/api/v0/add", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .multipart(form)
            .send()
            .await
            .context("Failed to upload to Lighthouse")?;

        let upload_resp: UploadResponse = response
            .json()
            .await
            .context("Failed to parse upload response")?;

        tracing::info!(
            "Uploaded to Lighthouse: CID={}, Size={}",
            upload_resp.data.hash,
            upload_resp.data.size
        );

        Ok(upload_resp.data.hash)
    }

    /// Upload file to Lighthouse
    pub async fn upload_file(&self, path: &Path) -> Result<String> {
        let file_bytes = tokio::fs::read(path).await?;
        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("file");

        let form = reqwest::multipart::Form::new()
            .part(
                "file",
                reqwest::multipart::Part::bytes(file_bytes)
                    .file_name(file_name.to_string()),
            );

        let response = self
            .client
            .post(&format!("{}/api/v0/add", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .multipart(form)
            .send()
            .await
            .context("Failed to upload file to Lighthouse")?;

        let upload_resp: UploadResponse = response
            .json()
            .await
            .context("Failed to parse upload response")?;

        tracing::info!(
            "Uploaded file to Lighthouse: CID={}, Size={}",
            upload_resp.data.hash,
            upload_resp.data.size
        );

        Ok(upload_resp.data.hash)
    }

    /// Pin existing CID to Filecoin via Lighthouse
    pub async fn pin_by_cid(&self, cid: &str) -> Result<()> {
        let response = self
            .client
            .get(&format!("{}/api/lighthouse/pin", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .query(&[("cid", cid)])
            .send()
            .await
            .context("Failed to pin CID")?;

        if response.status().is_success() {
            tracing::info!("Pinned CID {} to Filecoin via Lighthouse", cid);
            Ok(())
        } else {
            let error_text = response.text().await?;
            anyhow::bail!("Failed to pin CID: {}", error_text)
        }
    }

    /// Get pin status
    pub async fn get_pin_status(&self, cid: &str) -> Result<PinStatus> {
        let response = self
            .client
            .get(&format!("{}/api/lighthouse/pin_status", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .query(&[("cid", cid)])
            .send()
            .await
            .context("Failed to get pin status")?;

        let status: PinStatus = response
            .json()
            .await
            .context("Failed to parse pin status")?;

        Ok(status)
    }
}

/// Web3.Storage client (alternative to Lighthouse)
pub struct Web3StorageClient {
    client: Client,
    token: String,
    base_url: String,
}

impl Web3StorageClient {
    pub fn new(token: String) -> Self {
        Self {
            client: Client::new(),
            token,
            base_url: "https://api.web3.storage".to_string(),
        }
    }

    /// Upload file to Web3.Storage
    pub async fn upload(&self, data: &[u8], filename: &str) -> Result<String> {
        let form = reqwest::multipart::Form::new()
            .part(
                "file",
                reqwest::multipart::Part::bytes(data.to_vec())
                    .file_name(filename.to_string()),
            );

        let response = self
            .client
            .post(&format!("{}/upload", self.base_url))
            .header("Authorization", format!("Bearer {}", self.token))
            .multipart(form)
            .send()
            .await
            .context("Failed to upload to Web3.Storage")?;

        #[derive(Deserialize)]
        struct UploadResp {
            cid: String,
        }

        let upload_resp: UploadResp = response
            .json()
            .await
            .context("Failed to parse Web3.Storage response")?;

        tracing::info!("Uploaded to Web3.Storage: CID={}", upload_resp.cid);

        Ok(upload_resp.cid)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lighthouse_client_creation() {
        let client = LighthouseClient::new("test_key".to_string());
        assert_eq!(client.api_key, "test_key");
    }

    #[test]
    fn test_web3_storage_client_creation() {
        let client = Web3StorageClient::new("test_token".to_string());
        assert_eq!(client.token, "test_token");
    }
}
