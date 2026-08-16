import { CryptoUtil } from './crypto.util';

describe('CryptoUtil', () => {
  it('should hash and compare passwords correctly', async () => {
    const password = 'MySecretPassword123!';
    const hash = await CryptoUtil.hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toEqual(password);

    const isValid = await CryptoUtil.comparePassword(password, hash);
    expect(isValid).toBe(true);

    const isInvalid = await CryptoUtil.comparePassword('WrongPassword', hash);
    expect(isInvalid).toBe(false);
  });

  it('should generate valid IoT API keys with prefix and SHA-256 hash', () => {
    const { rawKey, keyHash, prefix } = CryptoUtil.generateApiKey();

    expect(rawKey).toMatch(/^betty_live_[a-f0-9]{48}$/);
    expect(prefix).toEqual(rawKey.substring(0, 16));
    expect(keyHash).toEqual(CryptoUtil.hashSha256(rawKey));
  });

  it('should generate 8-character team invite codes', () => {
    const code1 = CryptoUtil.generateTeamCode();
    const code2 = CryptoUtil.generateTeamCode();

    expect(code1).toHaveLength(8);
    expect(code2).toHaveLength(8);
    expect(code1).not.toEqual(code2);
  });

  it('should generate 64-character hex secure tokens', () => {
    const token = CryptoUtil.generateSecureToken();
    expect(token).toHaveLength(64);
  });
});
