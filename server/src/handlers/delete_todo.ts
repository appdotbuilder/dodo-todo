
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type DeleteTodoInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function deleteTodo(input: DeleteTodoInput, userId: string): Promise<{ success: boolean }> {
  try {
    // Delete the todo that belongs to the authenticated user
    const result = await db.delete(todosTable)
      .where(and(
        eq(todosTable.id, input.id),
        eq(todosTable.userId, userId)
      ))
      .execute();

    // Return success if any rows were affected (todo existed and was deleted)
    return { success: (result.rowCount ?? 0) > 0 };
  } catch (error) {
    console.error('Todo deletion failed:', error);
    throw error;
  }
}
