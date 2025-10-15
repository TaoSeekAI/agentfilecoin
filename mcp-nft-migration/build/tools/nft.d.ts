interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
    };
}
/**
 * NFT scanning and discovery tools
 */
export declare const nftTools: {
    getToolDefinitions(): ToolDefinition[];
    hasHandler(toolName: string): boolean;
    handleTool(toolName: string, args: any): Promise<any>;
    nftScan(args: {
        contract_address: string;
        token_ids?: string[];
    }): Promise<any>;
    getNftMetadata(args: {
        contract_address: string;
        token_id: string;
    }): Promise<any>;
};
export {};
//# sourceMappingURL=nft.d.ts.map