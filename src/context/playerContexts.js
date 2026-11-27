import { createContext, useContext } from "react";

// ============================================================================
// Split Context: изоляция тиков таймера (Time) от каталога (State) и методов
// ============================================================================
export const PlayerStateContext = createContext(null);
export const PlayerTimeContext = createContext(null);
export const PlayerActionsContext = createContext(null);

export function usePlayerState() {
	const ctx = useContext(PlayerStateContext);
	if (!ctx) throw new Error("usePlayerState must be used inside <PlayerProvider>");
	return ctx;
}

export function usePlayerTime() {
	const ctx = useContext(PlayerTimeContext);
	if (!ctx) throw new Error("usePlayerTime must be used inside <PlayerProvider>");
	return ctx;
}

export function usePlayerActions() {
	const ctx = useContext(PlayerActionsContext);
	if (!ctx) throw new Error("usePlayerActions must be used inside <PlayerProvider>");
	return ctx;
}
