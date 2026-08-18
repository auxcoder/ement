/**
 * Service interface tokens (Symbols).
 * Tokens are the "interfaces" — they define what you ask for, not what you get.
 *
 * @module di/tokens
 */

// TODO: Phase 2, Task 2.3
export const HttpToken = Symbol('Http');
export const RouterToken = Symbol('Router');
export const StorageToken = Symbol('Storage');
export const AuthToken = Symbol('Auth');
