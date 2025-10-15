///! NFT Scanner Agent
///!
///! 职责:
///! - 扫描 OpenSea/链上 NFT 项目
///! - 提取所有 token metadata
///! - 解析 IPFS 资源链接
///! - 支持 ERC-721 和 ERC-1155

use anyhow::{anyhow, Context, Result};
use ethers::{
    abi::{Abi, Token},
    contract::Contract,
    core::types::{Address, U256},
    providers::{Http, Middleware, Provider},
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::time::{sleep, Duration};
use tracing::{debug, info, warn};

/// IPFS 网关列表（按优先级排序）
const IPFS_GATEWAYS: &[&str] = &[
    "https://ipfs.io/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
    "https://gateway.pinata.cloud/ipfs/",
    "https://dweb.link/ipfs/",
    "https://w3s.link/ipfs/",
];

/// Token 元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenMetadata {
    pub token_id: U256,
    pub metadata_uri: String,
    pub owner: Option<Address>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub image: Option<String>,
    pub animation_url: Option<String>,
    pub external_url: Option<String>,
    pub attributes: Vec<MetadataAttribute>,
    pub resources: Vec<IpfsResource>,
}

/// NFT 属性
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetadataAttribute {
    pub trait_type: String,
    pub value: serde_json::Value,
    pub display_type: Option<String>,
}

/// IPFS 资源
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct IpfsResource {
    pub cid: String,
    pub url: String,
    pub resource_type: ResourceType,
    pub size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ResourceType {
    Image,
    Video,
    Audio,
    Model3D,
    Document,
    Unknown,
}

/// NFT 合约类型
#[derive(Debug, Clone)]
pub enum NftContractType {
    ERC721,
    ERC1155,
    Unknown,
}

/// NFT Scanner Agent
pub struct NFTScannerAgent {
    contract_address: Address,
    provider: Arc<Provider<Http>>,
    contract_type: NftContractType,
    http_client: reqwest::Client,
    max_retries: u32,
}

impl NFTScannerAgent {
    /// 创建新的 NFT Scanner
    pub async fn new(
        contract_address: Address,
        rpc_url: &str,
        max_retries: u32,
    ) -> Result<Self> {
        let provider = Provider::<Http>::try_from(rpc_url)
            .context("Failed to create provider")?;
        let provider = Arc::new(provider);

        // 检测合约类型
        let contract_type = Self::detect_contract_type(&provider, contract_address).await?;

        // 创建 HTTP 客户端（支持多次重试）
        let http_client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .context("Failed to create HTTP client")?;

        Ok(Self {
            contract_address,
            provider,
            contract_type,
            http_client,
            max_retries,
        })
    }

    /// 检测合约类型
    async fn detect_contract_type(
        provider: &Arc<Provider<Http>>,
        address: Address,
    ) -> Result<NftContractType> {
        // ERC-721 接口 ID: 0x80ac58cd
        let erc721_interface_id = [0x80, 0xac, 0x58, 0xcd];

        // ERC-1155 接口 ID: 0xd9b67a26
        let erc1155_interface_id = [0xd9, 0xb6, 0x7a, 0x26];

        // 尝试调用 supportsInterface
        let supports_erc721 = Self::check_interface(provider, address, &erc721_interface_id).await;
        let supports_erc1155 = Self::check_interface(provider, address, &erc1155_interface_id).await;

        match (supports_erc721, supports_erc1155) {
            (Ok(true), _) => {
                info!("Detected ERC-721 contract");
                Ok(NftContractType::ERC721)
            }
            (_, Ok(true)) => {
                info!("Detected ERC-1155 contract");
                Ok(NftContractType::ERC1155)
            }
            _ => {
                warn!("Could not detect contract type, assuming ERC-721");
                Ok(NftContractType::ERC721)
            }
        }
    }

    /// 检查合约是否支持特定接口
    async fn check_interface(
        provider: &Arc<Provider<Http>>,
        address: Address,
        interface_id: &[u8; 4],
    ) -> Result<bool> {
        // 构造 supportsInterface(bytes4) 调用
        let mut calldata = vec![0x01, 0xff, 0xc9, 0xa7]; // supportsInterface selector
        calldata.extend_from_slice(&[0; 28]); // padding
        calldata.extend_from_slice(interface_id);

        let call = ethers::core::types::TransactionRequest::new()
            .to(address)
            .data(calldata);

        match provider.call(&call.into(), None).await {
            Ok(result) => {
                // 解析返回值（bool）
                Ok(!result.is_empty() && result[result.len() - 1] == 1)
            }
            Err(_) => Ok(false),
        }
    }

    /// 扫描 NFT 项目，获取所有 token
    pub async fn scan_nft_project(&self) -> Result<Vec<TokenMetadata>> {
        info!(
            "Starting NFT project scan for contract: {:?}",
            self.contract_address
        );

        match self.contract_type {
            NftContractType::ERC721 => self.scan_erc721().await,
            NftContractType::ERC1155 => self.scan_erc1155().await,
            NftContractType::Unknown => {
                Err(anyhow!("Cannot scan unknown contract type"))
            }
        }
    }

    /// 扫描 ERC-721 合约
    async fn scan_erc721(&self) -> Result<Vec<TokenMetadata>> {
        let mut tokens = Vec::new();

        // 尝试获取 totalSupply
        let total_supply = self.get_total_supply().await?;
        info!("Total supply: {}", total_supply);

        // 遍历所有 token ID
        for token_id in 0..total_supply.as_u64() {
            let token_id = U256::from(token_id);

            match self.get_token_metadata(token_id).await {
                Ok(metadata) => {
                    info!("Scanned token #{}", token_id);
                    tokens.push(metadata);
                }
                Err(e) => {
                    warn!("Failed to get metadata for token #{}: {}", token_id, e);
                    // 继续处理其他 token
                }
            }

            // 添加小延迟避免 rate limiting
            if token_id.as_u64() % 10 == 0 {
                sleep(Duration::from_millis(100)).await;
            }
        }

        Ok(tokens)
    }

    /// 扫描 ERC-1155 合约
    async fn scan_erc1155(&self) -> Result<Vec<TokenMetadata>> {
        // ERC-1155 没有标准的枚举方法
        // 通常需要通过事件日志或外部 API
        warn!("ERC-1155 scanning requires event logs or external API");

        // 这里提供一个基本实现，实际使用时可能需要调整
        let mut tokens = Vec::new();

        // 尝试扫描 ID 0-1000（可配置范围）
        for token_id in 0..1000 {
            let token_id = U256::from(token_id);

            match self.get_token_metadata(token_id).await {
                Ok(metadata) => {
                    tokens.push(metadata);
                }
                Err(_) => {
                    // ERC-1155 可能有不连续的 ID
                    continue;
                }
            }
        }

        Ok(tokens)
    }

    /// 获取 totalSupply
    async fn get_total_supply(&self) -> Result<U256> {
        // totalSupply() 函数选择器: 0x18160ddd
        let calldata = hex::decode("18160ddd").unwrap();

        let call = ethers::core::types::TransactionRequest::new()
            .to(self.contract_address)
            .data(calldata);

        let result = self
            .provider
            .call(&call.into(), None)
            .await
            .context("Failed to call totalSupply")?;

        // 解析 uint256 返回值
        if result.len() >= 32 {
            Ok(U256::from_big_endian(&result[..32]))
        } else {
            Err(anyhow!("Invalid totalSupply response"))
        }
    }

    /// 获取单个 token 的 metadata
    pub async fn get_token_metadata(&self, token_id: U256) -> Result<TokenMetadata> {
        // 获取 tokenURI
        let metadata_uri = self.get_token_uri(token_id).await?;

        debug!("Token #{} URI: {}", token_id, metadata_uri);

        // 下载并解析 metadata JSON
        let metadata_json = self.download_metadata(&metadata_uri).await?;

        // 解析 JSON
        let mut metadata: serde_json::Value = serde_json::from_str(&metadata_json)
            .context("Failed to parse metadata JSON")?;

        // 提取字段
        let name = metadata["name"].as_str().map(String::from);
        let description = metadata["description"].as_str().map(String::from);
        let image = metadata["image"].as_str().map(String::from);
        let animation_url = metadata["animation_url"].as_str().map(String::from);
        let external_url = metadata["external_url"].as_str().map(String::from);

        // 解析 attributes
        let attributes = if let Some(attrs) = metadata["attributes"].as_array() {
            attrs
                .iter()
                .filter_map(|attr| {
                    Some(MetadataAttribute {
                        trait_type: attr["trait_type"].as_str()?.to_string(),
                        value: attr["value"].clone(),
                        display_type: attr["display_type"].as_str().map(String::from),
                    })
                })
                .collect()
        } else {
            Vec::new()
        };

        // 提取所有 IPFS 资源
        let resources = self.extract_ipfs_resources(&metadata).await?;

        Ok(TokenMetadata {
            token_id,
            metadata_uri,
            owner: None, // 可选：调用 ownerOf 获取
            name,
            description,
            image,
            animation_url,
            external_url,
            attributes,
            resources,
        })
    }

    /// 获取 tokenURI
    async fn get_token_uri(&self, token_id: U256) -> Result<String> {
        // tokenURI(uint256) 函数选择器: 0xc87b56dd
        let mut calldata = hex::decode("c87b56dd").unwrap();

        // 添加 token_id 参数（32 字节，大端序）
        let mut token_id_bytes = [0u8; 32];
        token_id.to_big_endian(&mut token_id_bytes);
        calldata.extend_from_slice(&token_id_bytes);

        let call = ethers::core::types::TransactionRequest::new()
            .to(self.contract_address)
            .data(calldata);

        let result = self
            .provider
            .call(&call.into(), None)
            .await
            .context("Failed to call tokenURI")?;

        // 解析 string 返回值
        // string 编码: offset(32) + length(32) + data
        if result.len() < 64 {
            return Err(anyhow!("Invalid tokenURI response"));
        }

        let offset = U256::from_big_endian(&result[0..32]).as_usize();
        let length = U256::from_big_endian(&result[32..64]).as_usize();

        if result.len() < 64 + length {
            return Err(anyhow!("Invalid tokenURI response length"));
        }

        let uri_bytes = &result[64..64 + length];
        let uri = String::from_utf8(uri_bytes.to_vec())
            .context("Invalid UTF-8 in tokenURI")?;

        Ok(uri)
    }

    /// 下载 metadata JSON
    async fn download_metadata(&self, uri: &str) -> Result<String> {
        // 处理不同的 URI 格式
        let url = self.normalize_uri(uri)?;

        debug!("Downloading metadata from: {}", url);

        // 重试下载
        for attempt in 1..=self.max_retries {
            match self.http_client.get(&url).send().await {
                Ok(response) => {
                    if response.status().is_success() {
                        let text = response.text().await
                            .context("Failed to read response body")?;
                        return Ok(text);
                    } else {
                        warn!(
                            "HTTP error {} (attempt {}/{})",
                            response.status(),
                            attempt,
                            self.max_retries
                        );
                    }
                }
                Err(e) => {
                    warn!("Download failed (attempt {}/{}): {}", attempt, self.max_retries, e);
                }
            }

            if attempt < self.max_retries {
                sleep(Duration::from_secs(2u64.pow(attempt - 1))).await;
            }
        }

        Err(anyhow!("Failed to download metadata after {} attempts", self.max_retries))
    }

    /// 标准化 URI（处理 ipfs://, https:// 等）
    fn normalize_uri(&self, uri: &str) -> Result<String> {
        if uri.starts_with("ipfs://") {
            // ipfs://Qm... -> https://ipfs.io/ipfs/Qm...
            let cid = uri.strip_prefix("ipfs://").unwrap();
            Ok(format!("{}{}", IPFS_GATEWAYS[0], cid))
        } else if uri.starts_with("http://") || uri.starts_with("https://") {
            Ok(uri.to_string())
        } else if uri.starts_with("Qm") || uri.starts_with("bafy") {
            // 裸 CID
            Ok(format!("{}{}", IPFS_GATEWAYS[0], uri))
        } else if uri.starts_with("data:") {
            // data URI（Base64 编码的 JSON）
            Err(anyhow!("Data URI not yet supported"))
        } else {
            Err(anyhow!("Unsupported URI format: {}", uri))
        }
    }

    /// 从 metadata 中提取所有 IPFS 资源
    pub async fn extract_ipfs_resources(
        &self,
        metadata: &serde_json::Value,
    ) -> Result<Vec<IpfsResource>> {
        let mut resources = Vec::new();

        // 检查 image
        if let Some(image_url) = metadata["image"].as_str() {
            if let Some(resource) = self.parse_ipfs_url(image_url, ResourceType::Image) {
                resources.push(resource);
            }
        }

        // 检查 animation_url
        if let Some(animation_url) = metadata["animation_url"].as_str() {
            if let Some(resource) = self.parse_ipfs_url(animation_url, ResourceType::Video) {
                resources.push(resource);
            }
        }

        // 检查 properties.files（某些 NFT 使用此字段）
        if let Some(files) = metadata["properties"]["files"].as_array() {
            for file in files {
                if let Some(uri) = file["uri"].as_str() {
                    if let Some(resource) = self.parse_ipfs_url(uri, ResourceType::Unknown) {
                        resources.push(resource);
                    }
                }
            }
        }

        // 递归检查所有字符串值
        self.extract_ipfs_from_value(metadata, &mut resources);

        // 去重
        resources.sort_by(|a, b| a.cid.cmp(&b.cid));
        resources.dedup_by(|a, b| a.cid == b.cid);

        Ok(resources)
    }

    /// 递归提取 JSON 中的 IPFS 链接
    fn extract_ipfs_from_value(&self, value: &serde_json::Value, resources: &mut Vec<IpfsResource>) {
        match value {
            serde_json::Value::String(s) => {
                if let Some(resource) = self.parse_ipfs_url(s, ResourceType::Unknown) {
                    resources.push(resource);
                }
            }
            serde_json::Value::Array(arr) => {
                for item in arr {
                    self.extract_ipfs_from_value(item, resources);
                }
            }
            serde_json::Value::Object(obj) => {
                for (_key, val) in obj {
                    self.extract_ipfs_from_value(val, resources);
                }
            }
            _ => {}
        }
    }

    /// 解析 IPFS URL，提取 CID
    fn parse_ipfs_url(&self, url: &str, resource_type: ResourceType) -> Option<IpfsResource> {
        // ipfs://Qm...
        if let Some(cid) = url.strip_prefix("ipfs://") {
            return Some(IpfsResource {
                cid: cid.to_string(),
                url: url.to_string(),
                resource_type,
                size: None,
            });
        }

        // https://ipfs.io/ipfs/Qm...
        // https://gateway.pinata.cloud/ipfs/Qm...
        if url.contains("/ipfs/") {
            if let Some(idx) = url.find("/ipfs/") {
                let cid = &url[idx + 6..];
                // 提取到第一个 / 或字符串结尾
                let cid = cid.split('/').next().unwrap_or(cid);
                let cid = cid.split('?').next().unwrap_or(cid); // 移除查询参数

                if self.is_valid_cid(cid) {
                    return Some(IpfsResource {
                        cid: cid.to_string(),
                        url: url.to_string(),
                        resource_type,
                        size: None,
                    });
                }
            }
        }

        // 裸 CID
        if self.is_valid_cid(url) {
            return Some(IpfsResource {
                cid: url.to_string(),
                url: format!("ipfs://{}", url),
                resource_type,
                size: None,
            });
        }

        None
    }

    /// 验证是否为有效的 IPFS CID
    fn is_valid_cid(&self, s: &str) -> bool {
        // CIDv0: Qm... (46 字符，Base58)
        // CIDv1: bafy... (多种长度，Base32)

        if s.len() == 46 && s.starts_with("Qm") {
            return s.chars().all(|c| {
                c.is_ascii_alphanumeric() || c == '_' || c == '-'
            });
        }

        if s.starts_with("bafy") || s.starts_with("bafk") || s.starts_with("bafybe") {
            return s.chars().all(|c| {
                c.is_ascii_lowercase() || c.is_ascii_digit()
            });
        }

        false
    }

    /// 从 IPFS 下载资源（用于验证）
    pub async fn download_ipfs_resource(&self, cid: &str) -> Result<Vec<u8>> {
        for gateway in IPFS_GATEWAYS {
            let url = format!("{}{}", gateway, cid);

            debug!("Trying gateway: {}", url);

            match self.http_client.get(&url).send().await {
                Ok(response) if response.status().is_success() => {
                    let bytes = response.bytes().await
                        .context("Failed to read response bytes")?;
                    info!("Downloaded {} bytes from {}", bytes.len(), gateway);
                    return Ok(bytes.to_vec());
                }
                Ok(response) => {
                    debug!("Gateway {} returned status {}", gateway, response.status());
                }
                Err(e) => {
                    debug!("Gateway {} failed: {}", gateway, e);
                }
            }
        }

        Err(anyhow!("Failed to download from all gateways"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_valid_cid() {
        let scanner = create_test_scanner();

        // CIDv0
        assert!(scanner.is_valid_cid("QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"));

        // CIDv1
        assert!(scanner.is_valid_cid("bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"));

        // Invalid
        assert!(!scanner.is_valid_cid("not-a-cid"));
        assert!(!scanner.is_valid_cid("Qm123")); // Too short
    }

    #[test]
    fn test_parse_ipfs_url() {
        let scanner = create_test_scanner();

        // ipfs:// protocol
        let resource = scanner.parse_ipfs_url(
            "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
            ResourceType::Image,
        );
        assert!(resource.is_some());
        assert_eq!(resource.unwrap().cid, "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG");

        // Gateway URL
        let resource = scanner.parse_ipfs_url(
            "https://ipfs.io/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
            ResourceType::Image,
        );
        assert!(resource.is_some());

        // Invalid
        let resource = scanner.parse_ipfs_url("https://example.com/image.png", ResourceType::Image);
        assert!(resource.is_none());
    }

    fn create_test_scanner() -> NFTScannerAgent {
        NFTScannerAgent {
            contract_address: "0x0000000000000000000000000000000000000000".parse().unwrap(),
            provider: Arc::new(Provider::<Http>::try_from("http://localhost:8545").unwrap()),
            contract_type: NftContractType::ERC721,
            http_client: reqwest::Client::new(),
            max_retries: 3,
        }
    }
}
