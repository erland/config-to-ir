/**
 * Backwards-compatible barrel.
 *
 * Existing imports throughout the codebase reference `../config/types`.
 * To keep changes minimal, we re-export schemas + inferred types here.
 */

export * from "./schema";
export * from "./model";
