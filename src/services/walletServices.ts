import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from "axios";

/* ======================================================
 * Types
 * ===================================================== */

export interface WalletAccessTokenResponse {
  code: string;
  description: string;
  data: AccessTokenData;
}

export interface AccessTokenData {
  businessId: string;
  access_token: string;
  refresh_token: string;
  expiresAt: string;
}

export interface BankAccountResponse {
  code: string;
  description: string;
  message: string;
  status: boolean;
  data: BankAccountData;
}

export interface BankAccountData {
  createdAt: string;
  bankAccountNumber: string;
  bankAccountName: string;
  bankName: string;
  accountRef: string;
  accountHolderId: string;
  accountName: string;
  currency: "NGN" | string;
  bvn: string;
  expired: boolean;
}

export interface SecureAuthenticationData {
  jwt: string;
  md: string;
  acsUrl: string;
  termUrl: string;
}

export interface TransactionResponseData {
  status: string; // "true" or "false" as string
  message: string;
  responseCode: string;
  transactionId: string;
  secureAuthenticationData: SecureAuthenticationData;
}

export interface TransactionResponse {
  code: string; // e.g., "00"
  description: string; // e.g., "Success"
  data: TransactionResponseData;
}

declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}

/* ======================================================
 * Wallet Service
 * ===================================================== */

class WalletService {
  private readonly apiKey: string;
  private readonly accountId: string;
  private readonly clientId: string;
  private readonly baseUrl = "https://sandbox.nomba.com";

  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number | null = null;

  private http: AxiosInstance;

  constructor() {
    this.apiKey = process.env.NOMBA_PRIVATE_KEY ?? "";
    this.accountId = process.env.NOMBA_ACCOUNT_ID ?? "";
    this.clientId = process.env.NOMBA_CLIENT_ID ?? "";

    if (!this.apiKey || !this.accountId || !this.clientId) {
      throw new Error("Missing NOMBA environment variables");
    }

    this.http = axios.create({
      baseURL: this.baseUrl,
      headers: {
        accountId: this.accountId,
      },
    });

    this.setupInterceptors();
  }

  /* ======================================================
   * Interceptors
   * ===================================================== */

  private setupInterceptors() {
    this.http.interceptors.request.use(async (config) => {
      if (!config.skipAuth) {
        await this.ensureValidToken();

        if (this.accessToken) {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${this.accessToken}`,
          } as any;
        }
      }

      return config;
    });

    this.http.interceptors.response.use(
      (res) => res,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean;
        };

        if (error.response?.status === 401 && !originalRequest?._retry) {
          originalRequest._retry = true;

          await this.issueAccessToken();

          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${this.accessToken}`,
          };

          return this.http(originalRequest);
        }

        return Promise.reject(error);
      },
    );
  }

  /* ======================================================
   * Token helpers
   * ===================================================== */

  private isTokenExpired() {
    if (!this.expiresAt) return true;
    return Date.now() >= this.expiresAt;
  }

  private async ensureValidToken() {
    if (this.accessToken && !this.isTokenExpired()) return;
    await this.issueAccessToken();
  }

  private saveTokenData(data: AccessTokenData) {
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.expiresAt = new Date(data.expiresAt).getTime() - 30_000;
  }

  /* ======================================================
   * Auth
   * ===================================================== */

  async issueAccessToken(): Promise<void> {
    const { data } = await this.http.post<WalletAccessTokenResponse>(
      "/v1/auth/token/issue",
      {
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.apiKey,
      },
      { skipAuth: true },
    );

    this.saveTokenData(data.data);
  }

  async revokeAccessToken(): Promise<void> {
    if (!this.refreshToken || !this.accessToken) return;

    await this.http.post(
      "/v1/auth/token/revoke",
      { refresh_token: this.refreshToken },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      },
    );

    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
  }

  /* ======================================================
   * Virtual Accounts
   * ===================================================== */

  async createVirtualAccount(
    accountName: string,
    accountRef: string,
  ): Promise<BankAccountData> {
    const { data } = await this.http.post<BankAccountResponse>(
      "/v1/accounts/virtual",
      {
        accountName,
        accountRef,
      },
    );

    return data.data;
  }

  async addCreditCard( card:{
  cardCVV:number,
  cardExpiryMonth: number,
  cardExpiryYear: number,
  cardNumber: string,
  cardPin: number
}
) {
    const res = await this.http.post("/v1/checkout/checkout-card-detail", card);
    return res.data as TransactionResponse;

  }
}

export default WalletService;
