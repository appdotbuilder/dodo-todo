
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable, usersTable } from '../db/schema';
import { type DeleteTodoInput } from '../schema';
import { deleteTodo } from '../handlers/delete_todo';
import { eq } from 'drizzle-orm';

const testUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User'
};

const otherTestUser = {
  id: 'user-2',
  email: 'other@example.com',
  name: 'Other User'
};

const testTodo = {
  id: 'todo-1',
  title: 'Test Todo',
  description: 'A test todo',
  completed: false,
  userId: testUser.id
};

const otherUserTodo = {
  id: 'todo-2',
  title: 'Other User Todo',
  description: 'Todo from another user',
  completed: false,
  userId: otherTestUser.id
};

describe('deleteTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a todo successfully', async () => {
    // Create test user and todo
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(todosTable).values(testTodo).execute();

    const input: DeleteTodoInput = { id: testTodo.id };
    const result = await deleteTodo(input, testUser.id);

    expect(result.success).toBe(true);

    // Verify todo was deleted from database
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, testTodo.id))
      .execute();

    expect(todos).toHaveLength(0);
  });

  it('should return false when todo does not exist', async () => {
    // Create test user but no todo
    await db.insert(usersTable).values(testUser).execute();

    const input: DeleteTodoInput = { id: 'nonexistent-todo' };
    const result = await deleteTodo(input, testUser.id);

    expect(result.success).toBe(false);
  });

  it('should not delete todo belonging to another user', async () => {
    // Create both users and a todo for the other user
    await db.insert(usersTable).values([testUser, otherTestUser]).execute();
    await db.insert(todosTable).values(otherUserTodo).execute();

    const input: DeleteTodoInput = { id: otherUserTodo.id };
    const result = await deleteTodo(input, testUser.id);

    expect(result.success).toBe(false);

    // Verify todo still exists in database
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, otherUserTodo.id))
      .execute();

    expect(todos).toHaveLength(1);
    expect(todos[0].userId).toBe(otherTestUser.id);
  });

  it('should only delete the specified todo when user has multiple todos', async () => {
    const secondTodo = {
      id: 'todo-3',
      title: 'Second Todo',
      description: 'Another test todo',
      completed: true,
      userId: testUser.id
    };

    // Create user and multiple todos
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(todosTable).values([testTodo, secondTodo]).execute();

    const input: DeleteTodoInput = { id: testTodo.id };
    const result = await deleteTodo(input, testUser.id);

    expect(result.success).toBe(true);

    // Verify only the specified todo was deleted
    const remainingTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.userId, testUser.id))
      .execute();

    expect(remainingTodos).toHaveLength(1);
    expect(remainingTodos[0].id).toBe(secondTodo.id);
    expect(remainingTodos[0].title).toBe('Second Todo');
  });
});
