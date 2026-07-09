import crypto from "crypto";

export async function hooksCron2(payload:string) {
  try {

    const signatureValue = "Kt9095hQxfgmVbx6iz7G2tPhHdbdXgLlyY/mf35sptw=";
    const nombaTimeStamp = "2025-09-29T10:51:44Z";
    const secret = "sampleSecret";

    const mySig = generateSignature(payload, secret, nombaTimeStamp);

    console.log(`Generated signature [${mySig}]`);
    console.log(`Expected signature [${signatureValue}]`);

    if (signatureValue.toLowerCase() === mySig.toLowerCase()) {
    return true
    } else {
    return false
    }
  } catch (ex: any) {
    console.error("Error occurred while generating signature:", ex.message);
        return false;
  }
}

export function generateSignature(payload: string, secret: string, timeStamp: string) {
console.log("Generating signature with payload:", payload);

  const requestPayload = payload as any;

  const data = requestPayload.data || {};
  const merchant = data.merchant || {};
  const transaction = data.transaction || {};

  const eventType = requestPayload.event_type || "";
  const requestId = requestPayload.requestId || "";
  const userId = merchant.userId || "";
  const walletId = merchant.walletId || "";
  const transactionId = transaction.transactionId || "";
  const transactionType = transaction.type || "";
  const transactionTime = transaction.time || "";
  let transactionResponseCode = transaction.responseCode || "";

  if (transactionResponseCode === "null") {
    transactionResponseCode = "";
  }

  const hashingPayload = `${eventType}:${requestId}:${userId}:${walletId}:${transactionId}:${transactionType}:${transactionTime}:${transactionResponseCode}:${timeStamp}`;

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(hashingPayload);
  return hmac.digest("base64");
}


// Run

