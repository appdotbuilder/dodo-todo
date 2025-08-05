
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, todosTable } from '../db/schema';
import { type CreateTodoInput } from '../schema';
import { createTodo } from '../handlers/create_todo';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  id: 'user_test_123',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  emailVerified: null
};

// Simple test input
const testInput: CreateTodoInput = {
  title: 'Test Todo',
  description: 'A todo for testing'
};

// Test input without description
const testInputNoDescription: CreateTodoInput = {
  title: 'Todo without description'
};

describe('createTodo', () => {
  beforeEach(async () => {
    await createDB();
    // Create test user first
    await db.insert(usersTable).values(testUser).execute();
  });
  
  afterEach(resetDB);

  it('should create a todo with description', async () => {
    const result = await createTodo(testInput, testUser.id);

    expect(result.title).toEqual('Test Todo');
    expect(result.description).toEqual('A todo for testing');
    expect(result.completed).toEqual(false);
    expect(result.userId).toEqual(testUser.id);
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should create a todo without description', async () => {
    const result = await createTodo(testInputNoDescription, testUser.id);

    expect(result.title).toEqual('Todo without description');
    expect(result.description).toBeNull();
    expect(result.completed).toEqual(false);
    expect(result.userId).toEqual(testUser.id);
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should save todo to database', async () => {
    const result = await createTodo(testInput, testUser.id);

    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, result.id))
      .execute();

    expect(todos).toHaveLength(1);
    expect(todos[0].title).toEqual('Test Todo');
    expect(todos[0].description).toEqual('A todo for testing');
    expect(todos[0].completed).toEqual(false);
    expect(todos[0].userId).toEqual(testUser.id);
    expect(todos[0].createdAt).toBeInstanceOf(Date);
    expect(todos[0].updatedAt).toBeInstanceOf(Date);
  });

  it('should create multiple todos for same user', async () => {
    const todo1 = await createTodo(testInput, testUser.id);
    const todo2 = await createTodo(testInputNoDescription, testUser.id);

    expect(todo1.id).not.toEqual(todo2.id);
    expect(todo1.userId).toEqual(testUser.id);
    expect(todo2.userId).toEqual(testUser.id);

    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.userId, testUser.id))
      .execute();

    expect(todos).toHaveLength(2);
  });
});
