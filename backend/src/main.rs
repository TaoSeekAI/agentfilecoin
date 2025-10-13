use agent_backend::{Config, ContractClient, IpfsClient, LighthouseClient, MCPHandler};
use alloy::primitives::U256;
use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use std::path::PathBuf;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Parser)]
#[command(name = "agent-cli")]
#[command(about = "ERC-8004 Agent CLI for Filecoin", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,

    #[arg(short, long, global = true)]
    config: Option<PathBuf>,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize configuration
    Init {
        #[arg(long)]
        network: String,

        #[arg(long)]
        private_key: String,

        #[arg(long)]
        identity_contract: String,

        #[arg(long)]
        reputation_contract: String,

        #[arg(long)]
        validation_contract: String,

        #[arg(long)]
        lighthouse_api_key: Option<String>,
    },

    /// Register a new agent
    Register {
        #[arg(long)]
        name: String,

        #[arg(long)]
        description: String,

        #[arg(long)]
        mcp_endpoint: String,

        #[arg(long)]
        image: Option<PathBuf>,
    },

    /// Query agent information
    Query {
        #[arg(long)]
        agent_id: u64,
    },

    /// Give feedback to an agent
    Feedback {
        #[arg(long)]
        agent_id: u64,

        #[arg(long)]
        score: u8,

        #[arg(long)]
        tags: Vec<String>,

        #[arg(long)]
        message: Option<String>,
    },

    /// Query agent reputation
    Reputation {
        #[arg(long)]
        agent_id: u64,
    },

    /// Test MCP functionality
    McpTest {
        #[arg(long)]
        agent_id: Option<u64>,

        #[arg(long)]
        tool: String,

        #[arg(long)]
        args: String,
    },

    /// Check storage status
    StorageStatus {
        #[arg(long)]
        cid: String,
    },

    /// Pin data to Filecoin
    Pin {
        #[arg(long)]
        file: PathBuf,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "agent_cli=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cli = Cli::parse();

    match cli.command {
        Commands::Init {
            network,
            private_key,
            identity_contract,
            reputation_contract,
            validation_contract,
            lighthouse_api_key,
        } => {
            cmd_init(
                network,
                private_key,
                identity_contract,
                reputation_contract,
                validation_contract,
                lighthouse_api_key,
            )
            .await?;
        }
        Commands::Register {
            name,
            description,
            mcp_endpoint,
            image,
        } => {
            let config = load_config(cli.config)?;
            cmd_register(&config, name, description, mcp_endpoint, image).await?;
        }
        Commands::Query { agent_id } => {
            let config = load_config(cli.config)?;
            cmd_query(&config, agent_id).await?;
        }
        Commands::Feedback {
            agent_id,
            score,
            tags,
            message,
        } => {
            let config = load_config(cli.config)?;
            cmd_feedback(&config, agent_id, score, tags, message).await?;
        }
        Commands::Reputation { agent_id } => {
            let config = load_config(cli.config)?;
            cmd_reputation(&config, agent_id).await?;
        }
        Commands::McpTest { agent_id, tool, args } => {
            let config = load_config(cli.config)?;
            cmd_mcp_test(&config, agent_id, tool, args).await?;
        }
        Commands::StorageStatus { cid } => {
            let config = load_config(cli.config)?;
            cmd_storage_status(&config, cid).await?;
        }
        Commands::Pin { file } => {
            let config = load_config(cli.config)?;
            cmd_pin(&config, file).await?;
        }
    }

    Ok(())
}

async fn cmd_init(
    network: String,
    private_key: String,
    identity_contract: String,
    reputation_contract: String,
    validation_contract: String,
    lighthouse_api_key: Option<String>,
) -> Result<()> {
    use agent_backend::config::{
        ensure_config_dir, Config, ContractsConfig, MCPConfig, NetworkConfig, StorageConfig,
        WalletConfig,
    };

    println!("Initializing agent-cli configuration...");

    let config_dir = ensure_config_dir()?;
    let config_path = config_dir.join("config.toml");

    // Determine RPC URL and chain ID based on network
    let (rpc_url, chain_id) = match network.as_str() {
        "calibration" => (
            "https://api.calibration.node.glif.io/rpc/v1".to_string(),
            314159,
        ),
        "mainnet" => ("https://api.node.glif.io/rpc/v1".to_string(), 314),
        _ => anyhow::bail!("Unknown network: {}. Use 'calibration' or 'mainnet'", network),
    };

    // Derive address from private key (simplified)
    let address = format!("0x{}", &private_key[2..42]); // Placeholder

    let config = Config {
        network: NetworkConfig {
            name: network,
            rpc_url,
            chain_id,
        },
        contracts: ContractsConfig {
            identity: identity_contract,
            reputation: reputation_contract,
            validation: validation_contract,
        },
        storage: StorageConfig {
            ipfs_api: "http://127.0.0.1:5001".to_string(),
            ipfs_gateway: "https://ipfs.io/ipfs/".to_string(),
            lighthouse_api_key: lighthouse_api_key.unwrap_or_default(),
            web3_storage_token: String::new(),
        },
        wallet: WalletConfig {
            private_key,
            address,
        },
        mcp: MCPConfig { default_timeout: 30 },
    };

    config.save(&config_path)?;

    println!("✅ Configuration saved to: {}", config_path.display());
    println!("   Network: {}", config.network.name);
    println!("   Chain ID: {}", config.network.chain_id);
    println!("   Identity Contract: {}", config.contracts.identity);
    println!("   Reputation Contract: {}", config.contracts.reputation);
    println!("   Validation Contract: {}", config.contracts.validation);

    Ok(())
}

async fn cmd_register(
    config: &Config,
    name: String,
    description: String,
    mcp_endpoint: String,
    image: Option<PathBuf>,
) -> Result<()> {
    println!("Registering new agent...");
    println!("  Name: {}", name);
    println!("  Description: {}", description);
    println!("  MCP Endpoint: {}", mcp_endpoint);

    // Initialize IPFS client
    let ipfs = IpfsClient::new(&config.storage.ipfs_api, &config.storage.ipfs_gateway)?;

    // Prepare agent metadata
    let mut metadata = serde_json::json!({
        "name": name,
        "description": description,
        "endpoints": [
            {
                "type": "mcp",
                "uri": mcp_endpoint
            }
        ],
        "supportedTrust": ["reputation", "validation"]
    });

    // Upload image if provided
    if let Some(image_path) = image {
        println!("  Uploading image...");
        let image_cid = ipfs.add_file(&image_path).await?;
        println!("  ✅ Image uploaded: ipfs://{}", image_cid);
        metadata["image"] = serde_json::json!(format!("ipfs://{}", image_cid));
    }

    // Upload metadata to IPFS
    println!("  Uploading metadata to IPFS...");
    let metadata_cid = ipfs.add_json(&metadata).await?;
    println!("  ✅ Metadata uploaded: ipfs://{}", metadata_cid);

    // Pin to Filecoin via Lighthouse
    if !config.storage.lighthouse_api_key.is_empty() {
        println!("  Pinning to Filecoin...");
        let lighthouse = LighthouseClient::new(config.storage.lighthouse_api_key.clone());
        lighthouse.pin_by_cid(&metadata_cid).await?;
        println!("  ✅ Pinned to Filecoin");
    }

    // Register with contract
    println!("  Registering with smart contract...");
    let contract_client = ContractClient::new(
        &config.network.rpc_url,
        &config.wallet.private_key,
        &config.contracts.identity,
        &config.contracts.reputation,
        &config.contracts.validation,
    )?;

    let agent_id = contract_client
        .register_agent(format!("ipfs://{}", metadata_cid))
        .await?;

    println!("\n🎉 Agent registered successfully!");
    println!("   Agent ID: {}", agent_id);
    println!("   Metadata CID: {}", metadata_cid);
    println!("   View at: {}{}", config.storage.ipfs_gateway, metadata_cid);

    Ok(())
}

async fn cmd_query(config: &Config, agent_id: u64) -> Result<()> {
    println!("Querying agent #{}...", agent_id);

    let contract_client = ContractClient::new(
        &config.network.rpc_url,
        &config.wallet.private_key,
        &config.contracts.identity,
        &config.contracts.reputation,
        &config.contracts.validation,
    )?;

    let agent = contract_client.get_agent(U256::from(agent_id)).await?;

    println!("\n📋 Agent Information:");
    println!("   Owner: {}", agent.owner);
    println!("   Metadata URI: {}", agent.metadata_uri);
    println!("   Registered At: {}", agent.registered_at);
    println!("   Active: {}", agent.is_active);

    // Fetch metadata from IPFS
    if agent.metadata_uri.starts_with("ipfs://") {
        let cid = agent.metadata_uri.strip_prefix("ipfs://").unwrap();
        let ipfs = IpfsClient::new(&config.storage.ipfs_api, &config.storage.ipfs_gateway)?;

        if let Ok(metadata) = ipfs.get_json(cid).await {
            println!("\n📄 Metadata:");
            println!("{}", serde_json::to_string_pretty(&metadata)?);
        }
    }

    Ok(())
}

async fn cmd_feedback(
    config: &Config,
    agent_id: u64,
    score: u8,
    tags: Vec<String>,
    message: Option<String>,
) -> Result<()> {
    if score > 100 {
        anyhow::bail!("Score must be between 0 and 100");
    }

    println!("Submitting feedback for agent #{}...", agent_id);
    println!("  Score: {}/100", score);
    println!("  Tags: {:?}", tags);

    let mut file_uri = String::new();

    // If message provided, upload to IPFS
    if let Some(msg) = message {
        let ipfs = IpfsClient::new(&config.storage.ipfs_api, &config.storage.ipfs_gateway)?;
        let feedback_data = serde_json::json!({
            "message": msg,
            "timestamp": chrono::Utc::now().to_rfc3339(),
        });

        let cid = ipfs.add_json(&feedback_data).await?;
        file_uri = format!("ipfs://{}", cid);
        println!("  ✅ Feedback details uploaded: {}", file_uri);
    }

    let contract_client = ContractClient::new(
        &config.network.rpc_url,
        &config.wallet.private_key,
        &config.contracts.identity,
        &config.contracts.reputation,
        &config.contracts.validation,
    )?;

    let feedback_id = contract_client
        .give_feedback(U256::from(agent_id), score, tags, file_uri)
        .await?;

    println!("\n✅ Feedback submitted!");
    println!("   Feedback ID: {}", feedback_id);

    Ok(())
}

async fn cmd_reputation(config: &Config, agent_id: u64) -> Result<()> {
    println!("Fetching reputation for agent #{}...", agent_id);

    let contract_client = ContractClient::new(
        &config.network.rpc_url,
        &config.wallet.private_key,
        &config.contracts.identity,
        &config.contracts.reputation,
        &config.contracts.validation,
    )?;

    let reputation = contract_client.get_reputation(U256::from(agent_id)).await?;

    println!("\n⭐ Reputation:");
    println!("   Average Score: {}/100", reputation.avg_score);
    println!("   Total Feedbacks: {}", reputation.total_feedbacks);
    println!("   Active Feedbacks: {}", reputation.active_feedbacks);

    Ok(())
}

async fn cmd_mcp_test(
    config: &Config,
    _agent_id: Option<u64>,
    tool: String,
    args: String,
) -> Result<()> {
    println!("Testing MCP tool: {}", tool);

    let mcp = MCPHandler::new("mcp://localhost:3000".to_string(), config.mcp.default_timeout);

    // Parse args JSON
    let args_value: serde_json::Value = serde_json::from_str(&args)
        .context("Failed to parse args as JSON")?;

    println!("  Arguments: {}", args_value);

    let result = mcp.call_tool(&tool, args_value).await?;

    if result.success {
        println!("\n✅ Tool executed successfully!");
        println!("   Result: {}", serde_json::to_string_pretty(&result.result)?);
    } else {
        println!("\n❌ Tool execution failed!");
        if let Some(error) = result.error {
            println!("   Error: {}", error);
        }
    }

    Ok(())
}

async fn cmd_storage_status(config: &Config, cid: String) -> Result<()> {
    println!("Checking storage status for CID: {}", cid);

    let ipfs = IpfsClient::new(&config.storage.ipfs_api, &config.storage.ipfs_gateway)?;

    let verified = ipfs.verify(&cid).await?;
    println!("  IPFS accessible: {}", if verified { "✅" } else { "❌" });

    if !config.storage.lighthouse_api_key.is_empty() {
        let lighthouse = LighthouseClient::new(config.storage.lighthouse_api_key.clone());
        match lighthouse.get_pin_status(&cid).await {
            Ok(status) => {
                println!("  Filecoin status: {}", status.status);
            }
            Err(e) => {
                println!("  Filecoin status: Error - {}", e);
            }
        }
    }

    Ok(())
}

async fn cmd_pin(config: &Config, file: PathBuf) -> Result<()> {
    println!("Pinning file to Filecoin: {}", file.display());

    if !config.storage.lighthouse_api_key.is_empty() {
        let lighthouse = LighthouseClient::new(config.storage.lighthouse_api_key.clone());
        let cid = lighthouse.upload_file(&file).await?;

        println!("\n✅ File pinned successfully!");
        println!("   CID: {}", cid);
        println!("   Gateway URL: {}{}", config.storage.ipfs_gateway, cid);
    } else {
        anyhow::bail!("Lighthouse API key not configured. Run 'agent-cli init' first.");
    }

    Ok(())
}

fn load_config(path: Option<PathBuf>) -> Result<Config> {
    let config_path = path.unwrap_or_else(Config::default_path);

    if !config_path.exists() {
        anyhow::bail!(
            "Configuration not found at {}. Run 'agent-cli init' first.",
            config_path.display()
        );
    }

    Config::load(&config_path)
}
