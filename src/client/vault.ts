/**
 * @trestleinc/crane - Client Vault Operations
 *
 * Zero-knowledge credential vault utilities for client-side encryption.
 * The server never sees plaintext credentials - all encryption/decryption
 * happens in the browser using Web Crypto API.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Vault data from the server (public fields only).
 */
export type VaultData = {
  organizationId: string;
  salt: string;
  iterations: number;
  encryptedVaultKey: string;
  vaultKeyIv: string;
  verificationHash: string;
  automationEnabled: boolean;
};

/**
 * Unlocked vault key for encryption/decryption operations.
 */
export type VaultKey = {
  key: CryptoKey;
  organizationId: string;
};

/**
 * Credential input for saving.
 */
export type CredentialInput = {
  name: string;
  domain: string;
  username: string;
  password: string;
  fields?: Record<string, string>;
};

/**
 * Encrypted credential payload.
 */
export type EncryptedPayload = {
  ciphertext: string;
  iv: string;
};

/**
 * Decrypted credential fields.
 */
export type DecryptedCredential = {
  username: string;
  password: string;
  fields?: Record<string, string>;
};

// ============================================================================
// Constants
// ============================================================================

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const PBKDF2_HASH = 'SHA-256';

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Convert ArrayBuffer or Uint8Array to base64 string.
 */
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer.
 */
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate a random IV for AES-GCM.
 */
function generateIv(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Generate a random salt for PBKDF2.
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Derive a key from a master password using PBKDF2.
 */
async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random AES key.
 */
async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: ALGORITHM, length: KEY_LENGTH }, true, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Encrypt data with AES-GCM.
 */
async function encrypt(key: CryptoKey, data: string): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const iv = generateIv();
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    encoder.encode(data)
  );

  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(iv),
  };
}

/**
 * Decrypt data with AES-GCM.
 */
async function decrypt(key: CryptoKey, ciphertext: string, iv: string): Promise<string> {
  const decoder = new TextDecoder();
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: base64ToBuffer(iv) },
    key,
    base64ToBuffer(ciphertext)
  );

  return decoder.decode(decrypted);
}

/**
 * Create a verification hash for password checking.
 */
async function createVerificationHash(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  const hash = await crypto.subtle.digest('SHA-256', exported);
  return bufferToBase64(hash);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Zero-knowledge vault operations.
 *
 * @example
 * ```typescript
 * import { vault } from '@trestleinc/crane/client';
 *
 * // Setup vault for organization
 * const setupData = await vault.setup('master-password-123');
 * await ctx.runMutation(api.crane.vault.setup, {
 *   organizationId: org.id,
 *   ...setupData,
 * });
 *
 * // Unlock vault
 * const vaultData = await ctx.runQuery(api.crane.vault.get, { organizationId: org.id });
 * const vaultKey = await vault.unlock('master-password-123', vaultData);
 *
 * // Save credential
 * const encrypted = await vault.credential.encrypt(vaultKey, {
 *   username: 'john@example.com',
 *   password: 'secret123',
 * });
 * await ctx.runMutation(api.crane.credential.create, {
 *   organizationId: org.id,
 *   name: 'Portal Login',
 *   domain: 'portal.example.com',
 *   encryptedPayload: encrypted.ciphertext,
 *   payloadIv: encrypted.iv,
 * });
 * ```
 */
export const vault = {
  /**
   * Generate vault setup data for a new organization.
   * Returns encrypted vault key and verification hash.
   */
  setup: async (
    masterPassword: string,
    iterations = 100000
  ): Promise<{
    salt: string;
    iterations: number;
    encryptedVaultKey: string;
    vaultKeyIv: string;
    verificationHash: string;
  }> => {
    // Generate salt for PBKDF2
    const salt = generateSalt();

    // Derive master key from password
    const masterKey = await deriveKey(masterPassword, salt, iterations);

    // Generate vault key (for encrypting credentials)
    const vaultKey = await generateKey();
    const exportedVaultKey = await crypto.subtle.exportKey('raw', vaultKey);

    // Encrypt vault key with master key
    const { ciphertext: encryptedVaultKey, iv: vaultKeyIv } = await encrypt(
      masterKey,
      bufferToBase64(exportedVaultKey)
    );

    // Create verification hash
    const verificationHash = await createVerificationHash(masterKey);

    return {
      salt: bufferToBase64(salt),
      iterations,
      encryptedVaultKey,
      vaultKeyIv,
      verificationHash,
    };
  },

  /**
   * Unlock a vault with the master password.
   * Returns the decrypted vault key for credential operations.
   */
  unlock: async (masterPassword: string, vaultData: VaultData): Promise<VaultKey> => {
    // Derive master key from password
    const masterKey = await deriveKey(
      masterPassword,
      new Uint8Array(base64ToBuffer(vaultData.salt)),
      vaultData.iterations
    );

    // Verify password
    const hash = await createVerificationHash(masterKey);
    if (hash !== vaultData.verificationHash) {
      throw new Error('Invalid vault password');
    }

    // Decrypt vault key
    const exportedVaultKey = await decrypt(
      masterKey,
      vaultData.encryptedVaultKey,
      vaultData.vaultKeyIv
    );

    // Import vault key
    const vaultKey = await crypto.subtle.importKey(
      'raw',
      base64ToBuffer(exportedVaultKey),
      { name: ALGORITHM, length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );

    return {
      key: vaultKey,
      organizationId: vaultData.organizationId,
    };
  },

  /**
   * Verify a master password without fully unlocking.
   */
  verify: async (masterPassword: string, vaultData: VaultData): Promise<boolean> => {
    try {
      const masterKey = await deriveKey(
        masterPassword,
        new Uint8Array(base64ToBuffer(vaultData.salt)),
        vaultData.iterations
      );
      const hash = await createVerificationHash(masterKey);
      return hash === vaultData.verificationHash;
    } catch {
      return false;
    }
  },

  /**
   * Credential encryption/decryption operations.
   */
  credential: {
    /**
     * Encrypt credential fields for storage.
     */
    encrypt: async (
      vaultKey: VaultKey,
      credential: DecryptedCredential
    ): Promise<EncryptedPayload> => {
      const payload = JSON.stringify(credential);
      return encrypt(vaultKey.key, payload);
    },

    /**
     * Decrypt credential fields.
     */
    decrypt: async (
      vaultKey: VaultKey,
      encrypted: EncryptedPayload
    ): Promise<DecryptedCredential> => {
      const payload = await decrypt(vaultKey.key, encrypted.ciphertext, encrypted.iv);
      return JSON.parse(payload);
    },
  },
} as const;
