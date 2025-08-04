
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test User',
  role: 'kasir'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.role).toEqual('kasir');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123'); // Should be hashed
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].full_name).toEqual('Test User');
    expect(users[0].role).toEqual('kasir');
    expect(users[0].is_active).toBe(true);
    expect(users[0].password_hash).toBeDefined();
  });

  it('should hash the password', async () => {
    const result = await createUser(testInput);

    // Password should be hashed, not stored as plain text
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash.length).toBeGreaterThan(20);

    // Verify password can be verified with Bun's password utility
    const isValid = await Bun.password.verify('password123', result.password_hash);
    expect(isValid).toBe(true);
  });

  it('should reject duplicate username', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create second user with same username
    const duplicateInput: CreateUserInput = {
      ...testInput,
      email: 'different@example.com'
    };

    expect(createUser(duplicateInput)).rejects.toThrow(/username already exists/i);
  });

  it('should reject duplicate email', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create second user with same email
    const duplicateInput: CreateUserInput = {
      ...testInput,
      username: 'differentuser'
    };

    expect(createUser(duplicateInput)).rejects.toThrow(/email already exists/i);
  });

  it('should create users with different roles', async () => {
    const adminUser = await createUser({
      ...testInput,
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin'
    });

    const managerUser = await createUser({
      ...testInput,
      username: 'manager',
      email: 'manager@example.com',
      role: 'manajer'
    });

    expect(adminUser.role).toEqual('admin');
    expect(managerUser.role).toEqual('manajer');
  });
});
