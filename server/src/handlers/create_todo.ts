
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type CreateTodoInput, type Todo } from '../schema';

export const createTodo = async (input: CreateTodoInput, userId: string): Promise<Todo> => {
  try {
    // Generate unique ID
    const todoId = `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insert todo record
    const result = await db.insert(todosTable)
      .values({
        id: todoId,
        title: input.title,
        description: input.description || null,
        completed: false,
        userId: userId
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Todo creation failed:', error);
    throw error;
  }
};
