use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::process::{Child, Command, Stdio};
use std::io::{BufRead, BufReader, Write};
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPTool {
    pub name: String,
    pub description: String,
    pub input_schema: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub piece_cid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub car_cid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_address: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// MCP Client for communicating with Filecoin MCP Server
pub struct MCPClient {
    process: Arc<Mutex<Option<Child>>>,
    request_id: Arc<Mutex<u64>>,
}

impl MCPClient {
    /// Start MCP server process and create client
    pub fn new(server_command: &str) -> Result<Self> {
        tracing::info!("Starting MCP server: {}", server_command);

        let mut child = Command::new("node")
            .arg(server_command)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .context("Failed to start MCP server")?;

        // Wait a bit for server to initialize
        std::thread::sleep(std::time::Duration::from_millis(500));

        tracing::info!("MCP server started successfully");

        Ok(Self {
            process: Arc::new(Mutex::new(Some(child))),
            request_id: Arc::new(Mutex::new(1)),
        })
    }

    /// Get next request ID
    fn next_request_id(&self) -> u64 {
        let mut id = self.request_id.lock().unwrap();
        let current = *id;
        *id += 1;
        current
    }

    /// Send JSON-RPC request to MCP server
    fn send_request(&self, method: &str, params: Value) -> Result<Value> {
        let mut process_guard = self.process.lock().unwrap();
        let process = process_guard.as_mut()
            .context("MCP server process not available")?;

        let request_id = self.next_request_id();

        let request = json!({
            "jsonrpc": "2.0",
            "id": request_id,
            "method": method,
            "params": params
        });

        let request_str = serde_json::to_string(&request)?;

        tracing::debug!("Sending MCP request: {}", request_str);

        // Write request to stdin
        if let Some(stdin) = process.stdin.as_mut() {
            writeln!(stdin, "{}", request_str)?;
            stdin.flush()?;
        } else {
            anyhow::bail!("MCP server stdin not available");
        }

        // Read response from stdout
        if let Some(stdout) = process.stdout.as_mut() {
            let mut reader = BufReader::new(stdout);
            let mut response_line = String::new();
            reader.read_line(&mut response_line)?;

            tracing::debug!("Received MCP response: {}", response_line);

            let response: Value = serde_json::from_str(&response_line)?;

            if let Some(error) = response.get("error") {
                anyhow::bail!("MCP error: {}", error);
            }

            Ok(response.get("result").cloned().unwrap_or(Value::Null))
        } else {
            anyhow::bail!("MCP server stdout not available");
        }
    }

    /// List available tools
    pub fn list_tools(&self) -> Result<Vec<MCPTool>> {
        let result = self.send_request("tools/list", json!({}))?;

        let tools: Vec<MCPTool> = serde_json::from_value(
            result.get("tools").cloned().unwrap_or(json!([]))
        )?;

        Ok(tools)
    }

    /// Call a tool
    pub fn call_tool(&self, name: &str, arguments: Value) -> Result<MCPResponse> {
        let result = self.send_request("tools/call", json!({
            "name": name,
            "arguments": arguments
        }))?;

        // Parse response from content array
        if let Some(content) = result.get("content").and_then(|c| c.as_array()) {
            if let Some(first) = content.first() {
                if let Some(text) = first.get("text").and_then(|t| t.as_str()) {
                    let response: MCPResponse = serde_json::from_str(text)?;
                    return Ok(response);
                }
            }
        }

        anyhow::bail!("Invalid MCP response format")
    }

    /// Upload data to Filecoin
    pub fn upload_to_filecoin(&self, data: &[u8], filename: &str) -> Result<MCPResponse> {
        let data_base64 = base64::encode(data);

        self.call_tool("upload_to_filecoin", json!({
            "data": data_base64,
            "filename": filename
        }))
    }

    /// Upload file to Filecoin
    pub fn upload_file_to_filecoin(&self, filepath: &str) -> Result<MCPResponse> {
        self.call_tool("upload_file_to_filecoin", json!({
            "filepath": filepath
        }))
    }

    /// Download from Filecoin
    pub fn download_from_filecoin(&self, piece_cid: &str) -> Result<Vec<u8>> {
        let response = self.call_tool("download_from_filecoin", json!({
            "piece_cid": piece_cid
        }))?;

        if !response.success {
            anyhow::bail!("Download failed: {:?}", response.error);
        }

        if let Some(data_base64) = response.data {
            let data = base64::decode(&data_base64)?;
            Ok(data)
        } else {
            anyhow::bail!("No data in response");
        }
    }

    /// Get storage status
    pub fn get_storage_status(&self, piece_cid: &str) -> Result<MCPResponse> {
        self.call_tool("get_storage_status", json!({
            "piece_cid": piece_cid
        }))
    }

    /// Create agent metadata and upload to Filecoin
    pub fn create_agent_metadata(
        &self,
        name: &str,
        description: &str,
        endpoints: Vec<serde_json::Value>,
        image: Option<&str>,
    ) -> Result<MCPResponse> {
        let mut args = json!({
            "name": name,
            "description": description,
            "endpoints": endpoints
        });

        if let Some(img) = image {
            args["image"] = json!(img);
        }

        self.call_tool("create_agent_metadata", args)
    }
}

impl Drop for MCPClient {
    fn drop(&mut self) {
        if let Ok(mut process_guard) = self.process.lock() {
            if let Some(mut process) = process_guard.take() {
                tracing::info!("Stopping MCP server");
                let _ = process.kill();
                let _ = process.wait();
            }
        }
    }
}

// Add base64 encoding/decoding helpers
mod base64 {
    use anyhow::Result;

    pub fn encode(data: &[u8]) -> String {
        use std::io::Write;
        let mut buf = Vec::new();
        {
            let mut encoder = base64::write::EncoderWriter::new(&mut buf, base64::STANDARD);
            encoder.write_all(data).unwrap();
        }
        String::from_utf8(buf).unwrap()
    }

    pub fn decode(s: &str) -> Result<Vec<u8>> {
        use std::io::Read;
        let mut decoder = base64::read::DecoderReader::new(s.as_bytes(), base64::STANDARD);
        let mut buf = Vec::new();
        decoder.read_to_end(&mut buf)?;
        Ok(buf)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mcp_response_parsing() {
        let json_str = r#"{
            "success": true,
            "piece_cid": "bafk...",
            "car_cid": "bafy...",
            "size": 1024,
            "provider_address": "0x...",
            "message": "Success"
        }"#;

        let response: MCPResponse = serde_json::from_str(json_str).unwrap();
        assert!(response.success);
        assert!(response.piece_cid.is_some());
    }
}
