
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/auth_login';

// Test input
const testLoginInput: LoginInput = {
  username: 'testuser',
  password: 'password123'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate user with valid credentials', async () => {
    // Create test user with hashed password using Bun's built-in hasher
    const hashedPassword = await Bun.password.hash(testLoginInput.password);
    await db.insert(usersTable).values({
      username: testLoginInput.username,
      email: 'test@example.com',
      password_hash: hashedPassword,
      full_name: 'Test User',
      role: 'kasir',
      is_active: true
    }).execute();

    const result = await loginUser(testLoginInput);

    // Verify user data
    expect(result.user.username).toEqual('testuser');
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.full_name).toEqual('Test User');
    expect(result.user.role).toEqual('kasir');
    expect(result.user.is_active).toBe(true);
    expect(result.user.id).toBeDefined();

    // Verify token exists
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    
    // Decode token to verify contents
    const decoded = JSON.parse(atob(result.token));
    expect(decoded.userId).toEqual(result.user.id);
    expect(decoded.username).toEqual('testuser');
    expect(decoded.role).toEqual('kasir');
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('should reject invalid username', async () => {
    const invalidInput: LoginInput = {
      username: 'nonexistent',
      password: 'password123'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should reject invalid password', async () => {
    // Create test user
    const hashedPassword = await Bun.password.hash('correctpassword');
    await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: hashedPassword,
      full_name: 'Test User',
      role: 'kasir',
      is_active: true
    }).execute();

    const invalidInput: LoginInput = {
      username: 'testuser',
      password: 'wrongpassword'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should reject inactive user', async () => {
    // Create inactive test user
    const hashedPassword = await Bun.password.hash(testLoginInput.password);
    await db.insert(usersTable).values({
      username: testLoginInput.username,
      email: 'test@example.com',
      password_hash: hashedPassword,
      full_name: 'Test User',
      role: 'kasir',
      is_active: false
    }).execute();

    await expect(loginUser(testLoginInput)).rejects.toThrow(/account is inactive/i);
  });

  it('should not include password hash in response', async () => {
    // Create test user
    const hashedPassword = await Bun.password.hash(testLoginInput.password);
    await db.insert(usersTable).values({
      username: testLoginInput.username,
      email: 'test@example.com',
      password_hash: hashedPassword,
      full_name: 'Test User',
      role: 'kasir',
      is_active: true
    }).execute();

    const result = await loginUser(testLoginInput);

    // Verify password hash is not included in response
    expect((result.user as any).password_hash).toBeUndefined();
  });
});
