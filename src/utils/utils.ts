import type { AuthenticationSettings } from "../types/client";

export const parseJSON = <T>(json: string): T => JSON.parse(json) as T;

export const validateAuthSettings = (credentials: AuthenticationSettings) => {
  const { username, password, otp_secret } = credentials;
  if (!username || typeof username !== "string") {
    throw new Error("Username is required and must be a string");
  }
  if (!password || typeof password !== "string") {
    throw new Error("Password is required and must be a string");
  }
  if (!otp_secret || typeof otp_secret !== "string") {
    throw new Error("OTP secret is required and must be a string");
  }
};
