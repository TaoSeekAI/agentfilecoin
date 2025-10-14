#!/bin/bash

# 上传部署报告到 Notion

set -e

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# 检查报告文件
if [ ! -f "deployment-report.md" ]; then
    echo "错误: deployment-report.md 未找到"
    echo "请先运行 ./scripts/deploy-and-test.sh"
    exit 1
fi

log_info "准备上传到 Notion..."

# 读取报告内容
REPORT_CONTENT=$(cat deployment-report.md)

# 创建临时 JSON 文件
cat > notion-payload.json << 'EOF'
{
  "parent": {
    "type": "page_id",
    "page_id": "REPLACE_WITH_PARENT_PAGE_ID"
  },
  "properties": {
    "title": {
      "title": [
        {
          "text": {
            "content": "ERC-8004 Agent + Filecoin 部署报告"
          }
        }
      ]
    }
  }
}
EOF

log_info "Notion 上传准备完成"
log_info ""
log_info "请使用以下信息手动创建 Notion 页面:"
log_info "1. 标题: ERC-8004 Agent + Filecoin 部署报告"
log_info "2. 内容: deployment-report.md 的内容"
log_info ""
log_info "或者使用 Notion API:"
echo ""
echo "export NOTION_TOKEN=your_integration_token"
echo "export NOTION_PARENT_PAGE_ID=your_parent_page_id"
echo ""
echo "然后运行 agent-cli 上传..."

log_success "准备完成！"
