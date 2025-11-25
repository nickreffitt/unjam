/**
 * PKCE (Proof Key for Code Exchange) utility functions
 * Implements RFC 7636 for secure OAuth authorization
 */

/**
 * Generates a cryptographically random code verifier
 * @returns A random string of 43-128 characters (base64url encoded)
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

/**
 * Generates a code challenge from a code verifier using SHA-256
 * @param verifier - The code verifier string
 * @returns The SHA-256 hash of the verifier, base64url encoded
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(new Uint8Array(hash));
}

/**
 * Base64URL encodes a Uint8Array
 * @param array - The byte array to encode
 * @returns Base64URL encoded string
 */
function base64urlEncode(array: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...array));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
