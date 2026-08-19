/**
 * TodoMVC Integration Test
 * Proves all modules work together: DI, services, state management.
 *
 * Run with: node --test app/todo/todo.test.js
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { container, TodoServiceToken } from "./main.js";
import { StorageToken } from "../../src/di/tokens.js";

describe("TodoMVC App — Integration", () => {
  beforeEach(() => {
    // Clear storage between tests
    const storage = container.resolve(StorageToken);
    storage.removeItem("ement-todos");
  });

  it("container resolves TodoService", () => {
    const todoService = container.resolve(TodoServiceToken);
    assert.ok(todoService);
    assert.equal(typeof todoService.load, "function");
    assert.equal(typeof todoService.add, "function");
  });

  it("full CRUD lifecycle", () => {
    const todoService = container.resolve(TodoServiceToken);

    // Start empty
    let todos = [];

    // Add
    todos = todoService.add(todos, "Buy milk");
    todos = todoService.add(todos, "Write tests");
    todos = todoService.add(todos, "Ship feature");
    assert.equal(todos.length, 3);
    assert.equal(todos[0].text, "Buy milk");
    assert.equal(todos[0].done, false);

    // Toggle
    todos = todoService.toggle(todos, todos[0].id);
    assert.equal(todos[0].done, true);

    // Remove
    const removeId = todos[1].id;
    todos = todoService.remove(todos, removeId);
    assert.equal(todos.length, 2);
    assert.ok(!todos.find((t) => t.id === removeId));

    // Clear completed
    todos = todoService.clearCompleted(todos);
    assert.equal(todos.length, 1);
    assert.equal(todos[0].text, "Ship feature");
  });

  it("persists to storage and reloads", () => {
    const todoService = container.resolve(TodoServiceToken);

    let todos = [];
    todos = todoService.add(todos, "Persistent todo");
    todoService.save(todos);

    // Reload from storage
    const loaded = todoService.load();
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].text, "Persistent todo");
  });

  it("each todo has a unique id", () => {
    const todoService = container.resolve(TodoServiceToken);

    let todos = [];
    todos = todoService.add(todos, "A");
    todos = todoService.add(todos, "B");

    assert.notEqual(todos[0].id, todos[1].id);
  });
});
