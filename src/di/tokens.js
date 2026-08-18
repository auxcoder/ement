/**
 * Service interface tokens (Symbols).
 * Tokens are the "interfaces" — they define what you ask for, not what you get.
 *
 * Register implementations against these tokens in a Container.
 * Consumers resolve by token — they never know the concrete implementation.
 *
 * @module di/tokens
 */

export const HttpToken = Symbol('Http');
export const RouterToken = Symbol('Router');
export const StorageToken = Symbol('Storage');
export const AuthToken = Symbol('Auth');
