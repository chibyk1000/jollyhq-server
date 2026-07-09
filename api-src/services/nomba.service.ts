import axios from "axios";

const nombaApi = axios.create({
  baseURL: process.env.NOMBA_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.NOMBA_SECRET_KEY}`,
    "Content-Type": "application/json",
    accountId: process.env.NOMBA_ACCOUNT_ID!,
  },
});

export default nombaApi;
