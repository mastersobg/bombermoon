/// <reference path="node.d.ts" />
/// <reference path="express.d.ts" />

declare module "express" {
	interface UserAgent {
		isMobile: bool;
		isDesktop: bool;
		Browser: string;
		Version: string;
		OS: string;
		Platform: string;
		source: string;
	}

	interface Request {
		useragent: UserAgent;
	}
}

declare module "express-useragent" {
	import express = module('express');

	export function express(): (req: express.Request, res: express.Response, next?: Function) => void;
}