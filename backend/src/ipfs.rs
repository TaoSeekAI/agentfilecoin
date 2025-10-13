use anyhow::{Context, Result};
use ipfs_api_backend_hyper::{IpfsApi, IpfsClient as HyperIpfsClient, TryFromUri};
use serde_json::Value;
use std::io::Cursor;

pub struct IpfsClient {
    client: HyperIpfsClient,
    gateway: String,
}

impl IpfsClient {
    pub fn new(api_url: &str, gateway: &str) -> Result<Self> {
        let client = HyperIpfsClient::from_str(api_url)
            .context("Failed to create IPFS client")?;

        Ok(Self {
            client,
            gateway: gateway.to_string(),
        })
    }

    /// Upload JSON data to IPFS
    pub async fn add_json(&self, data: &Value) -> Result<String> {
        let json_str = serde_json::to_string(data)?;
        let data_cursor = Cursor::new(json_str);

        let response = self
            .client
            .add(data_cursor)
            .await
            .context("Failed to add data to IPFS")?;

        Ok(response.hash)
    }

    /// Upload file to IPFS
    pub async fn add_file(&self, path: &std::path::Path) -> Result<String> {
        let file = tokio::fs::File::open(path).await?;
        let reader = tokio::io::BufReader::new(file);

        let response = self
            .client
            .add(reader)
            .await
            .context("Failed to add file to IPFS")?;

        Ok(response.hash)
    }

    /// Get JSON data from IPFS
    pub async fn get_json(&self, cid: &str) -> Result<Value> {
        let data = self
            .client
            .cat(cid)
            .map_ok(|chunk| chunk.to_vec())
            .try_concat()
            .await
            .context("Failed to get data from IPFS")?;

        let json: Value = serde_json::from_slice(&data)
            .context("Failed to parse JSON from IPFS")?;

        Ok(json)
    }

    /// Pin CID to local IPFS node
    pub async fn pin(&self, cid: &str) -> Result<()> {
        self.client
            .pin_add(cid, false)
            .await
            .context("Failed to pin CID")?;

        tracing::info!("Pinned {} to local IPFS node", cid);
        Ok(())
    }

    /// Unpin CID from local IPFS node
    pub async fn unpin(&self, cid: &str) -> Result<()> {
        self.client
            .pin_rm(cid, false)
            .await
            .context("Failed to unpin CID")?;

        tracing::info!("Unpinned {} from local IPFS node", cid);
        Ok(())
    }

    /// Get gateway URL for CID
    pub fn gateway_url(&self, cid: &str) -> String {
        format!("{}{}", self.gateway, cid)
    }

    /// Verify CID is accessible
    pub async fn verify(&self, cid: &str) -> Result<bool> {
        match self.client.object_stat(cid).await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_ipfs_client_creation() {
        let client = IpfsClient::new("http://127.0.0.1:5001", "https://ipfs.io/ipfs/");
        assert!(client.is_ok());
    }

    #[tokio::test]
    async fn test_gateway_url() {
        let client = IpfsClient::new("http://127.0.0.1:5001", "https://ipfs.io/ipfs/")
            .unwrap();
        let url = client.gateway_url("QmTest123");
        assert_eq!(url, "https://ipfs.io/ipfs/QmTest123");
    }
}
