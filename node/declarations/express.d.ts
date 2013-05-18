/// <reference path="node.d.ts" />

/*

How to use:

import express = module("express");
var express = require('express');
var app:express.Application = express();

*/

declare module "express" {
    import stream = module("stream");
    import express = module("express");
    //declare function callHack(): app;

    //export var app: Application;

    export function (): Application;
    export function static (path: string): (req: Request, res: Response, next?: Function) => void;

    interface Application extends Function {
        (): Application;

        set (name: string, value: any): any;
        get (name: string): any;

        enable(name: string): void;
        disable(name: string): void;

        enabled(name: string): bool;
        disabled(name: string): bool;

        configure(callback: () => void ): void;
        configure(env: string, callback: () => void ): void;

        engine(ext: string, callback: (path: string, options: any, callback: any) => void ): void;

        param(callback: (req: Request, res: Response, next, id) => void );
        param(name: string, callback: (req: Request, res: Response, next, id) => void );

        get (path: string, ...callbacks: Function[]);
        post(path: string, ...callbacks: Function[]);
        all(path: string, ...callbacks: Function[]);

        get (path: RegExp, ...callbacks: Function[]);
        post(path: RegExp, ...callbacks: Function[]);
        all(path: RegExp, ...callbacks: Function[]);

        locals: any;

        render(view: string, options: any, callback: (err, html) => void );

        routes: any;

        listen(port: number): void;

        router: (req: Request, res: Response, next?: Function) => void;

        use(item: (req: Request, res: Response, next?: Function) => void ): Application;
    }

    interface Request {
        params: any;
        query: any;
        body: any;
        files: any /*<RequestFileBody>*/;

        param(name: string): any;
        route: RequestRoute;
        cookies: any;
        signedCookies: any;
        get(field: string): any;

        accepts(type: string): void;
        accepts(type: string[]): void;
        accepted: RequestAccepted[];

        is(type: string): bool;
        ip: string;
        ips: string[];
        path: string;
        host: string;
        fresh: bool;
        stale: bool;
        xhr: bool;
        protocol: string;
        secure: bool;
        subdomains: string[];
        acceptedLanguages: string[];
        acceptedCharsets: string[];
        acceptsCharset(charset: string): bool;
        acceptsLanguage(lang: string): bool;
    }

    interface RequestAccepted {
        value: string;
        quality: number;
        type: string;
        subtype: string;
    }

    interface RequestRoute {
        path: string;
        method: string;
        callbacks: Function[];
        keys: any;
        regexp: RegExp;
        params: any;
    }

    interface RequestFileBody {
        size?: number;
        path?: string;
        name?: string;
        type?: string;
        hash?: bool;
        lastModifiedDate?: Date;
        _writeStream?: any;
        length?: number;
        filename?: string;
        mime?: string;
    }

    interface Response extends stream.WritableStream {
        app: Application;

        statusCode: number;

        status(code: number): Response;

        setHeader(key: string, value: any): Response;

        set (field: Object): Response;
        set (field: string, value: string): Response;

        get (field: string): string;

        cookie(name: string, value: string, options?: ResponseCookieOptions): Response;
        clearCookie(name: string, options?: ResponseCookieOptions): Response;

        redirect(url: string): Response;
        redirect(status: number, url: string): Response;

        charset: string;

        send(body: any): Response;
        send(status: number, body?: any): Response;

        json(body: any): Response;
        json(status: number, body?: any): Response;

        jsonp(body: any): Response;
        jsonp(status: number, body?: any): Response;

        type(type: string): Response;

        format(object: Object): Response;

        attachment(filename?: string): Response;

        sendfile(path: string, options?: ResponseSendfileOptions, fn?: (err?) => void ): Response;
        download(path: string, filename?: string, fn?: (err?) => void ): Response;
        links(links: Object);

        locals: Object;

        render(view: string, callback: (err, html: string) => void );
        render(view: string, locals: Object, callback?: (err, html: string) => void );

        writeHead(code: number, options: any): void;
    }

    interface ResponseSendfileOptions {
        maxAge?: number;
        root?: string;
    }

    interface ResponseCookieOptions {
        domain?: string;
        path?: string;
        secure?: bool;
        expires?: Date;
        maxAge?: number;
        httpOnly?: bool;
        signed?: bool;
    }

    export function bodyParser(options?: any): (req: Request, res: Response, next?: Function) => void;
    export function cookieParser(secret?: string): (req: Request, res: Response, next?: Function) => void;

}

declare module "http" {
    import express3 = module("express");

    export function createServer(app: any): Server;
}
