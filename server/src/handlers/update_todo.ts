
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type UpdateTodoInput, type Todo } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateTodo = async (input: UpdateTodoInput, userId: string): Promise<Todo> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.completed !== undefined) {
      updateData.completed = input.completed;
    }

    // Update the todo - ensure it belongs to the user
    const result = await db.update(todosTable)
      .set(updateData)
      .where(and(
        eq(todosTable.id, input.id),
        eq(todosTable.userId, userId)
      ))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Todo not found or access denied');
    }

    return result[0];
  } catch (error) {
    console.error('Todo update failed:', error);
    throw error;
  }
};
