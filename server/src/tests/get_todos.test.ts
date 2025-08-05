
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, todosTable } from '../db/schema';
import { getTodos } from '../handlers/get_todos';

describe('getTodos', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no todos', async () => {
    // Create a user first
    const user = await db.insert(usersTable)
      .values({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    const result = await getTodos(user[0].id);

    expect(result).toEqual([]);
  });

  it('should return todos for specific user', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User One'
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          name: 'User Two'
        }
      ])
      .returning()
      .execute();

    // Create todos for different users
    await db.insert(todosTable)
      .values([
        {
          id: 'todo-1',
          title: 'User 1 Todo 1',
          description: 'First todo for user 1',
          completed: false,
          userId: users[0].id
        },
        {
          id: 'todo-2',
          title: 'User 1 Todo 2',
          description: 'Second todo for user 1',
          completed: true,
          userId: users[0].id
        },
        {
          id: 'todo-3',
          title: 'User 2 Todo',
          description: 'Todo for user 2',
          completed: false,
          userId: users[1].id
        }
      ])
      .execute();

    const result = await getTodos(users[0].id);

    expect(result).toHaveLength(2);
    expect(result.every(todo => todo.userId === users[0].id)).toBe(true);
    expect(result.some(todo => todo.title === 'User 1 Todo 1')).toBe(true);
    expect(result.some(todo => todo.title === 'User 1 Todo 2')).toBe(true);
    expect(result.some(todo => todo.title === 'User 2 Todo')).toBe(false);
  });

  it('should return todos ordered by creation date (newest first)', async () => {
    // Create a user
    const user = await db.insert(usersTable)
      .values({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    // Create todos with different timestamps
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000); // 1 minute earlier
    const latest = new Date(now.getTime() + 60000); // 1 minute later

    await db.insert(todosTable)
      .values([
        {
          id: 'todo-1',
          title: 'Middle Todo',
          userId: user[0].id,
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'todo-2',
          title: 'Oldest Todo',
          userId: user[0].id,
          createdAt: earlier,
          updatedAt: earlier
        },
        {
          id: 'todo-3',
          title: 'Newest Todo',
          userId: user[0].id,
          createdAt: latest,
          updatedAt: latest
        }
      ])
      .execute();

    const result = await getTodos(user[0].id);

    expect(result).toHaveLength(3);
    expect(result[0].title).toBe('Newest Todo');
    expect(result[1].title).toBe('Middle Todo');
    expect(result[2].title).toBe('Oldest Todo');
  });

  it('should return todos with all required fields', async () => {
    // Create a user
    const user = await db.insert(usersTable)
      .values({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    // Create a todo
    await db.insert(todosTable)
      .values({
        id: 'todo-1',
        title: 'Test Todo',
        description: 'Test description',
        completed: true,
        userId: user[0].id
      })
      .execute();

    const result = await getTodos(user[0].id);

    expect(result).toHaveLength(1);
    const todo = result[0];
    expect(todo.id).toBe('todo-1');
    expect(todo.title).toBe('Test Todo');
    expect(todo.description).toBe('Test description');
    expect(todo.completed).toBe(true);
    expect(todo.userId).toBe(user[0].id);
    expect(todo.createdAt).toBeInstanceOf(Date);
    expect(todo.updatedAt).toBeInstanceOf(Date);
  });
});
