/** Parameters returned by the server when creating an invoice */
export interface InvoiceParams {
  memo: string;
  startTime: string;
  endTime: string;
  amount: string;
}

/** Payload sent from the client to /api/build-payment */
export interface BuildPaymentRequest {
  walletAddress: string;
}

/** Response from /api/build-payment */
export interface BuildPaymentResponse {
  transaction: string; // base64-encoded unsigned transaction
  invoice: InvoiceParams;
}

/** Payload sent from the client to /api/verify-payment */
export interface VerifyPaymentRequest {
  walletAddress: string;
  signature: string;
  invoice: InvoiceParams;
}

/** Response from /api/verify-payment */
export interface VerifyPaymentResponse {
  verified: boolean;
  randomNumber?: number;
  error?: string;
}
