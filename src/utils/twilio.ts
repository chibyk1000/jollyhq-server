import twilio from "twilio";
export const sendVerifyPhoneOTP = async (
  phone: string,
  otp: string,

) => {
  const client = twilio(
    process.env.TWILIO_SID as string,
    process.env.TWILIO_TOKEN as string,
  );

  let messageText = `Your  code is ${otp}`;


  const message = await client.messages.create({
    body: messageText,
    from: process.env.TWILIO_PHONE_NUMBER, // your Twilio number
    to: phone,
  });

  return message;
};
