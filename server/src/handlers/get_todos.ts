
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type Todo } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getTodos(userId: string): Promise<Todo[]> {
  try {
    const results = await db.select()
      .from(todosTable)
      .where(eq(todosTable.userId, userId))
      .orderBy(desc(todosTable.createdAt))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch todos:', error);
    throw error;
  }
}
