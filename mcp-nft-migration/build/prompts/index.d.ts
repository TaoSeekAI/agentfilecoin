interface Prompt {
    name: string;
    description: string;
    arguments?: Array<{
        name: string;
        description: string;
        required?: boolean;
    }>;
}
/**
 * Prompt templates for guiding migration workflows
 */
export declare const promptTemplates: {
    getPromptList(): Prompt[];
    getPrompt(name: string, args: any): Promise<string>;
    getMigrationWorkflow(contractAddress: string): string;
    getTroubleshooting(errorCode?: string): string;
    getSetupGuide(): string;
    getQuickTest(): string;
};
export {};
//# sourceMappingURL=index.d.ts.map