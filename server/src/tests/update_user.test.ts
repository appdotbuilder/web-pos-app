
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user with all fields', async () => {
    // Create a user first
    const createResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        full_name: 'Test User',
        role: 'kasir'
      })
      .returning()
      .execute();

    const userId = createResult[0].id;

    // Update user
    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'updateduser',
      email: 'updated@example.com',
      full_name: 'Updated User',
      role: 'manajer',
      is_active: false
    };

    const result = await updateUser(updateInput);

    // Verify updated fields
    expect(result.id).toEqual(userId);
    expect(result.username).toEqual('updateduser');
    expect(result.email).toEqual('updated@example.com');
    expect(result.full_name).toEqual('Updated User');
    expect(result.role).toEqual('manajer');
    expect(result.is_active).toEqual(false);
    expect(result.password_hash).toEqual('hashedpassword123'); // Should remain unchanged
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user with partial fields', async () => {
    // Create a user first
    const createResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        full_name: 'Test User',
        role: 'kasir'
      })
      .returning()
      .execute();

    const userId = createResult[0].id;
    const originalCreatedAt = createResult[0].created_at;

    // Update only email and role
    const updateInput: UpdateUserInput = {
      id: userId,
      email: 'newemail@example.com',
      role: 'admin'
    };

    const result = await updateUser(updateInput);

    // Verify only specified fields were updated
    expect(result.id).toEqual(userId);
    expect(result.username).toEqual('testuser'); // Should remain unchanged
    expect(result.email).toEqual('newemail@example.com'); // Should be updated
    expect(result.full_name).toEqual('Test User'); // Should remain unchanged
    expect(result.role).toEqual('admin'); // Should be updated
    expect(result.is_active).toEqual(true); // Should remain unchanged (default)
    expect(result.password_hash).toEqual('hashedpassword123'); // Should remain unchanged
    expect(result.created_at).toEqual(originalCreatedAt); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalCreatedAt).toBe(true); // Should be newer
  });

  it('should save updated user to database', async () => {
    // Create a user first
    const createResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        full_name: 'Test User',
        role: 'kasir'
      })
      .returning()
      .execute();

    const userId = createResult[0].id;

    // Update user
    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'dbuser',
      is_active: false
    };

    await updateUser(updateInput);

    // Verify changes were saved to database
    const dbUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(dbUser).toHaveLength(1);
    expect(dbUser[0].username).toEqual('dbuser');
    expect(dbUser[0].email).toEqual('test@example.com'); // Unchanged
    expect(dbUser[0].is_active).toEqual(false);
    expect(dbUser[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    const updateInput: UpdateUserInput = {
      id: 999,
      username: 'nonexistent'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/User with id 999 not found/i);
  });

  it('should handle unique constraint violations', async () => {
    // Create two users
    const user1 = await db.insert(usersTable)
      .values({
        username: 'user1',
        email: 'user1@example.com',
        password_hash: 'hashedpassword123',
        full_name: 'User One',
        role: 'kasir'
      })
      .returning()
      .execute();

    await db.insert(usersTable)
      .values({
        username: 'user2',
        email: 'user2@example.com',
        password_hash: 'hashedpassword456',
        full_name: 'User Two',
        role: 'kasir'
      })
      .returning()
      .execute();

    // Try to update user1 with user2's username
    const updateInput: UpdateUserInput = {
      id: user1[0].id,
      username: 'user2'
    };

    await expect(updateUser(updateInput)).rejects.toThrow();
  });
});
