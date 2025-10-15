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
 * Setup tools for environment verification and authorization setup
 */
export declare const setupTools: {
    getToolDefinitions(): ToolDefinition[];
    hasHandler(toolName: string): boolean;
    handleTool(toolName: string, args: any): Promise<any>;
    verifySetup(): Promise<any>;
    setupApprovals(depositAmount: number): Promise<any>;
    checkBalances(): Promise<any>;
};
export {};
//# sourceMappingURL=setup.d.ts.map