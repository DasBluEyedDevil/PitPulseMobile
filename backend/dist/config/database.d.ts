import { Pool } from 'pg';
declare class Database {
    private pool;
    private static instance;
    private constructor();
    static getInstance(): Database;
    getPool(): Pool;
    query(text: string, params?: any[]): Promise<any>;
    getClient(): Promise<import("pg").PoolClient>;
    close(): Promise<void>;
    healthCheck(): Promise<boolean>;
}
export default Database;
//# sourceMappingURL=database.d.ts.map