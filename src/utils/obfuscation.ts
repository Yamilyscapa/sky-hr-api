/**
 * Obfuscation utilities for QR code payloads
 * Provides functions to obfuscate and deobfuscate data using a secret key
 */

/**
 * Obfuscates a payload by appending a secret and converting to hex
 * @param payload - The data to obfuscate
 * @param secret - The secret key for obfuscation
 * @returns Hex-encoded obfuscated string
 */
export const obfuscatePayload = (payload: string, secret: string): string => {
  if (!secret) {
    throw new Error("Secret is required");
  }

  const obfuscated = Buffer.from(payload + secret).toString("hex");
  return obfuscated;
};

/**
 * Deobfuscates a hex-encoded payload by removing the secret
 * @param obfuscatedPayload - The hex-encoded obfuscated data
 * @param secret - The secret key used for obfuscation
 * @returns The original payload string
 */
export const deobfuscatePayload = (obfuscatedPayload: string, secret: string): string => {

  if (!secret) {
    throw new Error("Secret is required");
  }

  try {
    // Convert hex back to string
    const buffer = Buffer.from(obfuscatedPayload, "hex");
    const payloadWithSecret = buffer.toString("utf8");

    if (payloadWithSecret.endsWith(secret)) {
      return payloadWithSecret.slice(0, -secret.length);
    }

    throw new Error(`Invalid obfuscated payload: secret mismatch. Expected to end with "${secret}" but got "${payloadWithSecret.slice(-secret.length)}"`);
  } catch (error) {
    throw new Error(`Failed to deobfuscate payload: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Obfuscates a JSON payload
 * @param payload - The object to obfuscate
 * @param secret - The secret key for obfuscation
 * @returns Hex-encoded obfuscated JSON string
 */
export const obfuscateJsonPayload = <T>(payload: T, secret: string): string => {

  if (!secret) {
    throw new Error("Secret is required");
  }

  const jsonString = JSON.stringify(payload);
  return obfuscatePayload(jsonString, secret);
};

/**
 * Deobfuscates a hex-encoded JSON payload
 * @param obfuscatedPayload - The hex-encoded obfuscated JSON data
 * @param secret - The secret key used for obfuscation
 * @returns The parsed JSON object
 */
export const deobfuscateJsonPayload = <T>(obfuscatedPayload: string, secret: string): T => {

  if (!secret) {
    throw new Error("Secret is required");
  }

  const jsonString = deobfuscatePayload(obfuscatedPayload, secret);

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    throw new Error(`Failed to parse deobfuscated JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
