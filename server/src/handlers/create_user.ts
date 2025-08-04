
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { eq, or } from 'drizzle-orm';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Check if username or email already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.username, input.username),
          eq(usersTable.email, input.email)
        )
      )
      .execute();

    if (existingUser.length > 0) {
      const conflictField = existingUser[0].username === input.username ? 'username' : 'email';
      throw new Error(`User with this ${conflictField} already exists`);
    }

    // Hash the password (simple hash for demo - in production use bcrypt)
    const password_hash = await Bun.password.hash(input.password);

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash,
        full_name: input.full_name,
        role: input.role
      })
      .returning()
      .execute();

    const user = result[0];
    return user;
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};
