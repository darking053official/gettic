import _sodium from 'libsodium-wrappers-sumo';

let sodium: any = null;

export async function initSodium() {
  if (!sodium) {
    await _sodium.ready;
    sodium = _sodium;
  }
  return sodium;
}

export async function generateSigningKeyPair() {
  const s = await initSodium();
  const keyPair = s.crypto_sign_keypair();
  
  return {
    publicKey: s.to_base64(keyPair.publicKey, s.base64_variants.URLSAFE_NO_PADDING),
    privateKey: s.to_base64(keyPair.privateKey, s.base64_variants.URLSAFE_NO_PADDING)
  };
}

export async function generateEncryptionKeyPair() {
  const s = await initSodium();
  const keyPair = s.crypto_box_keypair();
  
  return {
    publicKey: s.to_base64(keyPair.publicKey, s.base64_variants.URLSAFE_NO_PADDING),
    privateKey: s.to_base64(keyPair.privateKey, s.base64_variants.URLSAFE_NO_PADDING)
  };
}

export async function signMessage(message: string, privateKey: string) {
  const s = await initSodium();
  const signature = s.crypto_sign_detached(
    s.from_string(message),
    s.from_base64(privateKey, s.base64_variants.URLSAFE_NO_PADDING)
  );
  
  return s.to_base64(signature, s.base64_variants.URLSAFE_NO_PADDING);
}

export async function verifySignature(message: string, signature: string, publicKey: string) {
  const s = await initSodium();
  try {
    const isValid = s.crypto_sign_verify_detached(
      s.from_base64(signature, s.base64_variants.URLSAFE_NO_PADDING),
      s.from_string(message),
      s.from_base64(publicKey, s.base64_variants.URLSAFE_NO_PADDING)
    );
    return isValid;
  } catch {
    return false;
  }
}

export async function encryptMessage(
  message: string,
  recipientPublicKey: string,
  senderPrivateKey: string
) {
  const s = await initSodium();
  const nonce = s.randombytes_buf(s.crypto_box_NONCEBYTES);
  const encrypted = s.crypto_box_easy(
    s.from_string(message),
    nonce,
    s.from_base64(recipientPublicKey, s.base64_variants.URLSAFE_NO_PADDING),
    s.from_base64(senderPrivateKey, s.base64_variants.URLSAFE_NO_PADDING)
  );
  
  return {
    ciphertext: s.to_base64(encrypted, s.base64_variants.URLSAFE_NO_PADDING),
    nonce: s.to_base64(nonce, s.base64_variants.URLSAFE_NO_PADDING)
  };
}

export async function decryptMessage(
  ciphertext: string,
  nonce: string,
  senderPublicKey: string,
  recipientPrivateKey: string
) {
  const s = await initSodium();
  const decrypted = s.crypto_box_open_easy(
    s.from_base64(ciphertext, s.base64_variants.URLSAFE_NO_PADDING),
    s.from_base64(nonce, s.base64_variants.URLSAFE_NO_PADDING),
    s.from_base64(senderPublicKey, s.base64_variants.URLSAFE_NO_PADDING),
    s.from_base64(recipientPrivateKey, s.base64_variants.URLSAFE_NO_PADDING)
  );
  
  return s.to_string(decrypted);
}

export async function generateNonce() {
  const s = await initSodium();
  const nonce = s.randombytes_buf(s.crypto_secretbox_NONCEBYTES);
  return s.to_base64(nonce, s.base64_variants.URLSAFE_NO_PADDING);
}

export async function generateRandomId(length: number = 16) {
  const s = await initSodium();
  const random = s.randombytes_buf(length);
  return s.to_base64(random, s.base64_variants.URLSAFE_NO_PADDING);
}

export async function hashData(data: string) {
  const s = await initSodium();
  const hash = s.crypto_generichash(32, s.from_string(data));
  return s.to_base64(hash, s.base64_variants.URLSAFE_NO_PADDING);
                                  }
