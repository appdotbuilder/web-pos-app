
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';

export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    const user = users[0];
    if (!user) {
      throw new Error('Invalid username or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is inactive');
    }

    // Verify password using Bun's built-in password verification
    const isValidPassword = await Bun.password.verify(input.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid username or password');
    }

    // Generate simple token (in production, use proper JWT library)
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    const token = btoa(JSON.stringify(tokenPayload));

    // Return auth response without password hash
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}
