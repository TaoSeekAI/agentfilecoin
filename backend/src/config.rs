use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub network: NetworkConfig,
    pub contracts: ContractsConfig,
    pub storage: StorageConfig,
    pub wallet: WalletConfig,
    #[serde(default)]
    pub mcp: MCPConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    pub name: String,
    pub rpc_url: String,
    pub chain_id: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractsConfig {
    pub identity: String,
    pub reputation: String,
    pub validation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    #[serde(default = "default_ipfs_api")]
    pub ipfs_api: String,
    #[serde(default = "default_ipfs_gateway")]
    pub ipfs_gateway: String,
    #[serde(default)]
    pub lighthouse_api_key: String,
    #[serde(default)]
    pub web3_storage_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletConfig {
    #[serde(skip_serializing)]
    pub private_key: String,
    pub address: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MCPConfig {
    #[serde(default = "default_timeout")]
    pub default_timeout: u64,
}

fn default_ipfs_api() -> String {
    "http://127.0.0.1:5001".to_string()
}

fn default_ipfs_gateway() -> String {
    "https://ipfs.io/ipfs/".to_string()
}

fn default_timeout() -> u64 {
    30
}

impl Config {
    pub fn load(path: &PathBuf) -> anyhow::Result<Self> {
        let content = std::fs::read_to_string(path)?;
        let config: Config = toml::from_str(&content)?;
        Ok(config)
    }

    pub fn save(&self, path: &PathBuf) -> anyhow::Result<()> {
        let content = toml::to_string_pretty(self)?;
        std::fs::write(path, content)?;
        Ok(())
    }

    pub fn default_path() -> PathBuf {
        dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join(".agent-cli")
            .join("config.toml")
    }
}

pub fn ensure_config_dir() -> anyhow::Result<PathBuf> {
    let config_dir = dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".agent-cli");

    if !config_dir.exists() {
        std::fs::create_dir_all(&config_dir)?;
    }

    Ok(config_dir)
}
