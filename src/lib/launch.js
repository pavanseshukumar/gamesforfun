import { create } from "zustand";

/**
 * Launch state shared between the root layout and the first screen (not saved).
 * `revealed` flips to true the moment the splash starts leaving, so the screen
 * underneath can play its entrance while the splash zooms away.
 */
export const useLaunch = create(() => ({ revealed: false }));

export const markRevealed = () => useLaunch.setState({ revealed: true });
