import { 
  generateSigningKeyPair, 
  generateEncryptionKeyPair,
  generateRandomId,
  initSodium 
} from './sodium';

export interface UserIdentity {
  userId: string;
  deviceId: string;
  signingKeyPair: {
    publicKey: string;
    privateKey: string;
  };
  encryptionKeyPair: {
    publicKey: string;
    privateKey: string;
  };
  createdAt: number;
}

export async function generateUserIdentity(userId: string): Promise<UserIdentity> {
  const signingKeyPair = await generateSigningKeyPair();
  const encryptionKeyPair = await generateEncryptionKeyPair();
  const deviceId = await generateRandomId(8);
  
  const identity: UserIdentity = {
    userId,
    deviceId,
    signingKeyPair,
    encryptionKeyPair,
    createdAt: Date.now()
  };
  
  await saveIdentity(identity);
  
  return identity;
}

export async function saveIdentity(identity: UserIdentity): Promise<void> {
  try {
    const identityKey = `gettic_identity_${identity.userId}_${identity.deviceId}`;
    localStorage.setItem(identityKey, JSON.stringify(identity));
    
    const currentKey = `gettic_current_identity_${identity.userId}`;
    localStorage.setItem(currentKey, JSON.stringify(identity));
  } catch (error) {
    console.error('Failed to save identity:', error);
    throw new Error('Identity could not be saved');
  }
}

export async function loadIdentity(userId: string, deviceId?: string): Promise<UserIdentity | null> {
  try {
    let identityKey: string;
    
    if (deviceId) {
      identityKey = `gettic_identity_${userId}_${deviceId}`;
    } else {
      identityKey = `gettic_current_identity_${userId}`;
    }
    
    const identityData = localStorage.getItem(identityKey);
    
    if (!identityData) {
      return null;
    }
    
    return JSON.parse(identityData) as UserIdentity;
  } catch (error) {
    console.error('Failed to load identity:', error);
    return null;
  }
}

export async function exportIdentity(identity: UserIdentity, password: string): Promise<string> {
  const s = await initSodium();
  
  const salt = s.randombytes_buf(s.crypto_pwhash_SALTBYTES);
  const key = s.crypto_pwhash(
    32,
    s.from_string(password),
    salt,
    s.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    s.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    s.crypto_pwhash_ALG_ARGON2ID13
  );
  
  const nonce = s.randombytes_buf(s.crypto_secretbox_NONCEBYTES);
  const identityString = JSON.stringify(identity);
  const encrypted = s.crypto_secretbox_easy(
    s.from_string(identityString),
    nonce,
    key
  );
  
  const exportedData = {
    salt: s.to_base64(salt, s.base64_variants.URLSAFE_NO_PADDING),
    nonce: s.to_base64(nonce, s.base64_variants.URLSAFE_NO_PADDING),
    ciphertext: s.to_base64(encrypted, s.base64_variants.URLSAFE_NO_PADDING)
  };
  
  return JSON.stringify(exportedData);
}

export async function importIdentity(exportedData: string, password: string): Promise<UserIdentity> {
  const s = await initSodium();
  
  const data = JSON.parse(exportedData);
  
  const key = s.crypto_pwhash(
    32,
    s.from_string(password),
    s.from_base64(data.salt, s.base64_variants.URLSAFE_NO_PADDING),
    s.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    s.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    s.crypto_pwhash_ALG_ARGON2ID13
  );
  
  const decrypted = s.crypto_secretbox_open_easy(
    s.from_base64(data.ciphertext, s.base64_variants.URLSAFE_NO_PADDING),
    s.from_base64(data.nonce, s.base64_variants.URLSAFE_NO_PADDING),
    key
  );
  
  const identity = JSON.parse(s.to_string(decrypted)) as UserIdentity;
  await saveIdentity(identity);
  
  return identity;
}

export async function deleteIdentity(userId: string, deviceId: string): Promise<void> {
  const identityKey = `gettic_identity_${userId}_${deviceId}`;
  localStorage.removeItem(identityKey);
  
  const currentKey = `gettic_current_identity_${userId}`;
  const currentIdentity = await loadIdentity(userId);
  
  if (currentIdentity && currentIdentity.deviceId === deviceId) {
    localStorage.removeItem(currentKey);
  }
}
