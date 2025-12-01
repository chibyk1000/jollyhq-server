"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletController = void 0;
// @ts-ignore – flutterwave-node-v3 has no type definitions
const flutterwave_node_v3_1 = __importDefault(require("flutterwave-node-v3"));
const flw = new flutterwave_node_v3_1.default(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY);
class WalletController {
    /**
     * Create a virtual wallet
     * @route POST /wallet/create
     */
    static async createWallet(payload) {
        const response = await flw.VirtualAcct.create(payload);
        return response;
    }
}
exports.WalletController = WalletController;
