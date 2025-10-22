/**
 * Obfuscation utilities for QR code payloads
 * Provides functions to obfuscate and deobfuscate data using a secret key
 */

/**
 * Obfuscates a payload by appending a secret and converting to hex
 * @param payload - The data to obfuscate
 * @param secret - The secret key for obfuscation (defaults to env var or fallback)
 * @returns Hex-encoded obfuscated string
 */
export const obfuscatePayload = (payload: string, secret?: string): string => {
  const secretKey = secret || process.env.QR_SECRET || "skyhr-secret-2024";
  const obfuscated = Buffer.from(payload + secretKey).toString("hex");
  return obfuscated;
};

/**
 * Deobfuscates a hex-encoded payload by removing the secret
 * @param obfuscatedPayload - The hex-encoded obfuscated data
 * @param secret - The secret key used for obfuscation (defaults to env var or fallback)
 * @returns The original payload string
 */
export const deobfuscatePayload = (obfuscatedPayload: string, secret?: string): string => {
  const secretKey = secret || process.env.QR_SECRET || "skyhr-secret-2024";
  
  try {
    // Convert hex back to string
    const buffer = Buffer.from(obfuscatedPayload, "hex");
    const payloadWithSecret = buffer.toString("utf8");
    
    // Remove the secret from the end
    if (payloadWithSecret.endsWith(secretKey)) {
      return payloadWithSecret.slice(0, -secretKey.length);
    }
    
    throw new Error("Invalid obfuscated payload: secret mismatch");
  } catch (error) {
    throw new Error(`Failed to deobfuscate payload: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Obfuscates a JSON payload
 * @param payload - The object to obfuscate
 * @param secret - The secret key for obfuscation (defaults to env var or fallback)
 * @returns Hex-encoded obfuscated JSON string
 */
export const obfuscateJsonPayload = <T>(payload: T, secret?: string): string => {
  const jsonString = JSON.stringify(payload);
  return obfuscatePayload(jsonString, secret);
};

/**
 * Deobfuscates a hex-encoded JSON payload
 * @param obfuscatedPayload - The hex-encoded obfuscated JSON data
 * @param secret - The secret key used for obfuscation (defaults to env var or fallback)
 * @returns The parsed JSON object
 */
export const deobfuscateJsonPayload = <T>(obfuscatedPayload: string, secret?: string): T => {
  const jsonString = deobfuscatePayload(obfuscatedPayload, secret);
  
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    throw new Error(`Failed to parse deobfuscated JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
