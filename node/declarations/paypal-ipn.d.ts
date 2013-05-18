declare module "paypal-ipn" {
	export function verify(ipn_params, callback: (err,msg) => void): void;
}
