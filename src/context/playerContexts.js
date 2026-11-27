// ============================================================================
// Split Context плеера: изоляция тиков таймера (Time) от каталога (State) и методов
// ============================================================================
import { createContext, useContext } from "react";

export const PlayerStateContext = createContext(null);
export const PlayerTimeContext = createContext(null);
export const PlayerActionsContext = createContext(null);

/** Состояние каталога, активного трека, очереди, лайков и полноэкранного плеера */
export function usePlayerState() {
	const ctx = useContext(PlayerStateContext);
	if (!ctx) throw new Error("usePlayerState must be used inside <PlayerProvider>");
	return ctx;
}

/** Часто обновляемые данные времени (`currentTimeMs`, `durationMs`, `progress`) */
export function usePlayerTime() {
	const ctx = useContext(PlayerTimeContext);
	if (!ctx) throw new Error("usePlayerTime must be used inside <PlayerProvider>");
	return ctx;
}

/** Стабильные мемоизированные методы управления (не вызывают ререндер при смене времени) */
export function usePlayerActions() {
	const ctx = useContext(PlayerActionsContext);
	if (!ctx) throw new Error("usePlayerActions must be used inside <PlayerProvider>");
	return ctx;
}
