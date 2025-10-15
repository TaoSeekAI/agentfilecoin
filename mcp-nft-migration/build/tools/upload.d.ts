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
 * Upload tools for Filecoin storage operations
 */
export declare const uploadTools: {
    getToolDefinitions(): ToolDefinition[];
    hasHandler(toolName: string): boolean;
    handleTool(toolName: string, args: any): Promise<any>;
    uploadToFilecoin(args: {
        nft_token_id: string;
        metadata: any;
        contract_address: string;
    }): Promise<any>;
    testUpload(fileSizeMb: number): Promise<any>;
};
export {};
//# sourceMappingURL=upload.d.ts.map