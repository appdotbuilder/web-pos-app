
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUsers } from '../handlers/get_users';
import { type CreateUserInput } from '../schema';

// Test user data
const testUser1: CreateUserInput = {
  username: 'testuser1',
  email: 'test1@example.com',
  password: 'password123',
  full_name: 'Test User One',
  role: 'kasir'
};

const testUser2: CreateUserInput = {
  username: 'testuser2',
  email: 'test2@example.com',
  password: 'password456',
  full_name: 'Test User Two',
  role: 'admin'
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    expect(result).toEqual([]);
  });

  it('should return all users from database', async () => {
    // Create test users directly in database
    await db.insert(usersTable).values([
      {
        username: testUser1.username,
        email: testUser1.email,
        password_hash: 'hashed_password_1',
        full_name: testUser1.full_name,
        role: testUser1.role
      },
      {
        username: testUser2.username,
        email: testUser2.email,
        password_hash: 'hashed_password_2',
        full_name: testUser2.full_name,
        role: testUser2.role
      }
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Check first user
    const user1 = result.find(u => u.username === 'testuser1');
    expect(user1).toBeDefined();
    expect(user1?.email).toEqual('test1@example.com');
    expect(user1?.full_name).toEqual('Test User One');
    expect(user1?.role).toEqual('kasir');
    expect(user1?.is_active).toBe(true);
    expect(user1?.created_at).toBeInstanceOf(Date);
    expect(user1?.updated_at).toBeInstanceOf(Date);
    expect(user1?.id).toBeDefined();

    // Check second user
    const user2 = result.find(u => u.username === 'testuser2');
    expect(user2).toBeDefined();
    expect(user2?.email).toEqual('test2@example.com');
    expect(user2?.full_name).toEqual('Test User Two');
    expect(user2?.role).toEqual('admin');
    expect(user2?.is_active).toBe(true);
  });

  it('should include inactive users', async () => {
    // Create an inactive user
    await db.insert(usersTable).values({
      username: 'inactiveuser',
      email: 'inactive@example.com',
      password_hash: 'hashed_password',
      full_name: 'Inactive User',
      role: 'kasir',
      is_active: false
    }).execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    expect(result[0].username).toEqual('inactiveuser');
    expect(result[0].is_active).toBe(false);
  });

  it('should return users with all required fields', async () => {
    await db.insert(usersTable).values({
      username: testUser1.username,
      email: testUser1.email,
      password_hash: 'hashed_password',
      full_name: testUser1.full_name,
      role: testUser1.role
    }).execute();

    const result = await getUsers();
    const user = result[0];

    // Verify all User schema fields are present
    expect(user.id).toBeDefined();
    expect(typeof user.id).toBe('number');
    expect(user.username).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.password_hash).toBeDefined();
    expect(user.full_name).toBeDefined();
    expect(user.role).toBeDefined();
    expect(typeof user.is_active).toBe('boolean');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });
});
