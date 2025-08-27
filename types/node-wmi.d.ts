declare module 'node-wmi';
declare module './vendor/wmi-query' {
	export interface QueryResult { cmd?: string; err?: any; data?: any; }
	export class Query {
		constructor(options?: any);
		buildCmd(): Query;
		exec(cb: (r: QueryResult) => void): void;
		static get(options: any, cb: (r: QueryResult) => void): void;
		static call(options: any, cb: (r: QueryResult) => void): void;
		static listAlias(options: any, cb: (r: QueryResult) => void): void;
	}
}
