declare module "mysql" {
    export function createConnection(params: Object): Connection;

    interface Connection {
        query(sql: string, cb: (err: any, rows: Array, fields: any) => void ): void;
        query(sql: string, params: any, cb: (err: any, rows: Array, fields: any) => void ): void;
        connect(): void;
        end(): void;
    }
}
