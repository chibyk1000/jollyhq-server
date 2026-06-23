"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerifyPhoneOTP = void 0;
const twilio_1 = __importDefault(require("twilio"));
const sendVerifyPhoneOTP = async (phone, otp) => {
    const client = (0, twilio_1.default)(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    let messageText = `Your  code is ${otp}`;
    const message = await client.messages.create({
        body: messageText,
        from: process.env.TWILIO_PHONE_NUMBER, // your Twilio number
        to: phone,
    });
    return message;
};
exports.sendVerifyPhoneOTP = sendVerifyPhoneOTP;
