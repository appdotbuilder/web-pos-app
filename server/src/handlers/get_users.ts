
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';

export async function getUsers(): Promise<User[]> {
  try {
    // Select all users from the database
    const results = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      password_hash: usersTable.password_hash, // Include for proper typing, will be omitted in return
      full_name: usersTable.full_name,
      role: usersTable.role,
      is_active: usersTable.is_active,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    })
    .from(usersTable)
    .execute();

    // Return users with password_hash included (as required by User type)
    // Note: In a real application, you might want to create a separate type without password_hash
    return results;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
}
