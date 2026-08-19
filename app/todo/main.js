/**
 * TodoMVC Demo App — Bootstrap
 * Uses all ng-modern modules: components, DI, routing, HTTP, forms, animations.
 *
 * This is the entry point. In the browser:
 *   <script type="module" src="./app/todo/main.js"></script>
 *
 * @module app/todo
 */

import { ElContainer } from "../../src/di/container.js";
import { HttpToken, StorageToken } from "../../src/di/tokens.js";

// ─── DI Container Setup ────────────────────────────────────────────────────────

export const container = new ElContainer();

// Storage — use localStorage (or in-memory for testing)
container.register(StorageToken, () => {
  if (typeof localStorage !== "undefined") return localStorage;
  // Node/test fallback
  const store = new Map();
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
});

// HTTP — not used in this demo (todos are local-only) but registered for completeness
container.register(HttpToken, () => ({
  get: async () => [],
  post: async (url, body) => body,
}));

// ─── Todo Service (registered in container) ────────────────────────────────────

const TodoServiceToken = Symbol("TodoService");
export { TodoServiceToken };

container.register(TodoServiceToken, (c) => {
  const storage = c.resolve(StorageToken);
  const STORAGE_KEY = "ng-modern-todos";
  let nextId = Date.now();

  return {
    load() {
      const raw = storage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    },

    save(todos) {
      storage.setItem(STORAGE_KEY, JSON.stringify(todos));
    },

    add(todos, text) {
      const todo = { id: ++nextId, text, done: false };
      const updated = [...todos, todo];
      this.save(updated);
      return updated;
    },

    toggle(todos, id) {
      const updated = todos.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t,
      );
      this.save(updated);
      return updated;
    },

    remove(todos, id) {
      const updated = todos.filter((t) => t.id !== id);
      this.save(updated);
      return updated;
    },

    clearCompleted(todos) {
      const updated = todos.filter((t) => !t.done);
      this.save(updated);
      return updated;
    },
  };
});

console.log("[TodoMVC] App bootstrapped. Container ready.");
