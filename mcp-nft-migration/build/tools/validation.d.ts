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
    registerAgent(args: {
        name: string;
        description: string;
        capabilities?: string[];
    }): Promise<any>;
    getAgentInfo(args: {
        agent_id: string;
    }): Promise<any>;
    createValidationRequest(args: {
        agent_id: string;
        task_description: string;
        nft_contract: string;
        token_range?: {
            start: number;
            end: number;
        };
        ipfs_cids?: string[];
    }): Promise<any>;
    submitValidation(args: {
        request_hash: string;
        is_valid: boolean;
        migration_results: Array<{
            ipfsCid: string;
            filecoinPieceCid: string;
            success: boolean;
        }>;
    }): Promise<any>;
    getValidationStatus(args: {
        request_hash: string;
    }): Promise<any>;
};
export {};
//# sourceMappingURL=validation.d.ts.map