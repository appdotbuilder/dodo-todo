
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, todosTable } from '../db/schema';
import { type UpdateTodoInput } from '../schema';
import { updateTodo } from '../handlers/update_todo';
import { eq } from 'drizzle-orm';

const testUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  emailVerified: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

const testTodo = {
  id: 'todo-1',
  title: 'Original Title',
  description: 'Original description',
  completed: false,
  userId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date()
};

const otherUser = {
  id: 'user-2',
  email: 'other@example.com',
  name: 'Other User',
  image: null,
  emailVerified: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('updateTodo', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test users
    await db.insert(usersTable).values([testUser, otherUser]).execute();
    
    // Create test todo
    await db.insert(todosTable).values(testTodo).execute();
  });

  afterEach(resetDB);

  it('should update todo title', async () => {
    const input: UpdateTodoInput = {
      id: 'todo-1',
      title: 'Updated Title'
    };

    const result = await updateTodo(input, 'user-1');

    expect(result.id).toBe('todo-1');
    expect(result.title).toBe('Updated Title');
    expect(result.description).toBe('Original description');
    expect(result.completed).toBe(false);
    expect(result.userId).toBe('user-1');
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.updatedAt.getTime()).toBeGreaterThan(testTodo.updatedAt.getTime());
  });

  it('should update todo description', async () => {
    const input: UpdateTodoInput = {
      id: 'todo-1',
      description: 'Updated description'
    };

    const result = await updateTodo(input, 'user-1');

    expect(result.title).toBe('Original Title');
    expect(result.description).toBe('Updated description');
    expect(result.completed).toBe(false);
  });

  it('should update todo completion status', async () => {
    const input: UpdateTodoInput = {
      id: 'todo-1',
      completed: true
    };

    const result = await updateTodo(input, 'user-1');

    expect(result.title).toBe('Original Title');
    expect(result.description).toBe('Original description');
    expect(result.completed).toBe(true);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateTodoInput = {
      id: 'todo-1',
      title: 'New Title',
      description: 'New description',
      completed: true
    };

    const result = await updateTodo(input, 'user-1');

    expect(result.title).toBe('New Title');
    expect(result.description).toBe('New description');
    expect(result.completed).toBe(true);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should handle null description', async () => {
    const input: UpdateTodoInput = {
      id: 'todo-1',
      description: null
    };

    const result = await updateTodo(input, 'user-1');

    expect(result.description).toBe(null);
    expect(result.title).toBe('Original Title');
  });

  it('should persist changes to database', async () => {
    const input: UpdateTodoInput = {
      id: 'todo-1',
      title: 'Persisted Title'
    };

    await updateTodo(input, 'user-1');

    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, 'todo-1'))
      .execute();

    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('Persisted Title');
    expect(todos[0].updatedAt).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent todo', async () => {
    const input: UpdateTodoInput = {
      id: 'non-existent',
      title: 'Updated Title'
    };

    await expect(updateTodo(input, 'user-1')).rejects.toThrow(/not found/i);
  });

  it('should throw error when user tries to update another users todo', async () => {
    const input: UpdateTodoInput = {
      id: 'todo-1',
      title: 'Unauthorized Update'
    };

    await expect(updateTodo(input, 'user-2')).rejects.toThrow(/not found|access denied/i);
  });
});
