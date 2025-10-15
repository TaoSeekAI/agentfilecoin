interface Resource {
    uri: string;
    name: string;
    description: string;
    mimeType: string;
}
/**
 * Resource providers for querying migration status, balances, and contracts
 */
export declare const resourceProviders: {
    getResourceList(): Resource[];
    readResource(uri: string): Promise<any>;
    getMigrationStatus(): Promise<any>;
    getBalances(): Promise<any>;
    getContracts(): Promise<any>;
    getEnvironment(): Promise<any>;
};
export {};
//# sourceMappingURL=index.d.ts.map