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
 * ERC-8004 validation tools
 */
export declare const validationTools: {
    getToolDefinitions(): ToolDefinition[];
    hasHandler(toolName: string): boolean;
    handleTool(toolName: string, args: any): Promise<any>;
    erc8004Validate(args: {
        piece_cid: string;
        token_id: string;
        contract_address: string;
    }): Promise<any>;
    updateContractUri(args: {
        contract_address: string;
        token_id: string;
        new_uri: string;
    }): Promise<any>;
};
export {};
//# sourceMappingURL=validation.d.ts.map