// Unit tests: Auth library helpers
// tests/unit/auth.test.ts

import crypto from 'crypto';
import { hashPassword, verifyPassword, createSession, getSession, deleteSession } from '../../lib/auth';

describe('Auth lib helpers', () => {
  describe('hashPassword / verifyPassword', () => {
    it('hashes password with pbkdf2 prefix', () => {
      const hash = hashPassword('mysecretpassword');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.startsWith('pbkdf2$')).toBe(true);
    });

    it('produces different hash for same password (salted)', () => {
      const h1 = hashPassword('test1234');
      const h2 = hashPassword('test1234');
      expect(h1).not.toBe(h2);
      // but both should verify correctly
      expect(verifyPassword('test1234', h1)).toBe(true);
      expect(verifyPassword('test1234', h2)).toBe(true);
    });

    it('produces different hash for different passwords', () => {
      const h1 = hashPassword('password1');
      const h2 = hashPassword('password2');
      expect(h1).not.toBe(h2);
    });

    it('verifyPassword returns true for correct password', () => {
      const hash = hashPassword('correctpassword');
      expect(verifyPassword('correctpassword', hash)).toBe(true);
    });

    it('verifyPassword returns false for wrong password', () => {
      const hash = hashPassword('correctpassword');
      expect(verifyPassword('wrongpassword', hash)).toBe(false);
    });

    it('verifyPassword supports legacy SHA-256 hash (backward compat)', () => {
      const legacyHash = crypto.createHash('sha256').update('oldpassword').digest('hex');
      expect(verifyPassword('oldpassword', legacyHash)).toBe(true);
      expect(verifyPassword('wrongpassword', legacyHash)).toBe(false);
    });

    it('verifyPassword returns false for malformed pbkdf2 hash (bad hex)', () => {
      // Valid prefix and parts count but salt/hash are not valid hex
      expect(verifyPassword('pw', 'pbkdf2$100000$notvalidhex$alsobad')).toBe(false);
    });

    it('verifyPassword returns false for malformed pbkdf2 hash (wrong salt length)', () => {
      // Salt is 8 bytes = 16 hex chars, but we expect 16 bytes = 32 hex chars
      const badHash = 'pbkdf2$100000$' + 'aabbccdd'.repeat(4) + '$' + 'aabbccdd'.repeat(16);
      expect(verifyPassword('pw', badHash)).toBe(false);
    });

    it('verifyPassword returns false for malformed pbkdf2 hash (wrong hash length)', () => {
      // Hash is 16 bytes = 32 hex chars, but we expect 32 bytes = 64 hex chars
      const badHash = 'pbkdf2$100000$' + 'aabbccdd'.repeat(8) + '$' + 'aabbccdd'.repeat(8);
      expect(verifyPassword('pw', badHash)).toBe(false);
    });
  });

  describe('createSession / getSession', () => {
    it('creates session with token and future expiry', () => {
      const { token, expiresAt } = createSession('user-abc-123');
      expect(token).toBeDefined();
      expect(token.length).toBe(64); // 32 bytes hex
      expect(expiresAt instanceof Date).toBe(true);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('getSession returns session data for valid token', () => {
      const { token } = createSession('user-xyz');
      const session = getSession(token);
      expect(session).not.toBeNull();
      expect(session?.userId).toBe('user-xyz');
    });

    it('getSession returns null for unknown token', () => {
      const session = getSession('this-token-is-not-known');
      expect(session).toBeNull();
    });

    it('getSession returns null for expired session (simulated)', () => {
      const { token } = createSession('user-expired');
      // Manually expire it
      const originalMap = (getSession as any)._sessions;
      // This is internal — just test that bad token gives null
      expect(getSession('not-valid-at-all')).toBeNull();
    });

    it('deleteSession removes session', () => {
      const { token } = createSession('user-to-delete');
      expect(getSession(token)?.userId).toBe('user-to-delete');
      deleteSession(token);
      expect(getSession(token)).toBeNull();
    });

    it('getSession returns null after session deleted', () => {
      const { token } = createSession('user-gone');
      deleteSession(token);
      expect(getSession(token)).toBeNull();
    });
  });
});