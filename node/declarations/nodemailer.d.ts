declare module "nodemailer" {
    export interface Transport {
        sendMail(params: Object, cb: (err, res)=>void): void;
    }

    export function createTransport(type: string, params: Object): Transport;
}