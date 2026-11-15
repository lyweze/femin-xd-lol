import { useState, useEffect, useCallback } from "react";

// ============================================================================
// Константы хранения состояния и горячих клавиш
// ============================================================================
const STORAGE_KEY = "matte_obsidian_sidebar_open";
const TOGGLE_KEY_CODE = "Backslash"; // Физическая клавиша `\` (работает в любой раскладке)

/**
 * Читает сохранённое состояние сайдбара из localStorage с защитой от ошибок парсинга.
 */
const readStoredState = (fallback) => {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved === null) return fallback;
		const parsed = JSON.parse(saved);
		return typeof parsed === "boolean" ? parsed : fallback;
	} catch {
		return fallback;
	}
};

/**
 * Хук управления состоянием боковой панели (`Sidebar`).
 *
 * Возможности:
 * 1. Сохраняет состояние открытости в `localStorage` между сессиями.
 * 2. Поддерживает глобальный шорткат `Cmd + \` (macOS) и `Ctrl + \` (Windows/Linux).
 * 3. Возвращает текущее состояние `isOpen` и стабильные методы `toggle`, `open`, `close`.
 */
export function useSidebar(defaultOpen = true) {
	const [isOpen, setIsOpen] = useState(() => readStoredState(defaultOpen));

	// ========================================================================
	// 1. Синхронизация состояния с localStorage и методы управления
	// ========================================================================
	const updateState = useCallback((updater) => {
		setIsOpen((prev) => {
			const next = typeof updater === "function" ? updater(prev) : updater;
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
			} catch {
				// Игнорируем ошибку, если localStorage недоступен (режим инкогнито/квота)
			}
			return next;
		});
	}, []);

	const toggle = useCallback(() => updateState((prev) => !prev), [updateState]);
	const open = useCallback(() => updateState(true), [updateState]);
	const close = useCallback(() => updateState(false), [updateState]);

	// ========================================================================
	// 2. Глобальный шорткат Cmd + \ или Ctrl + \
	// ========================================================================
	useEffect(() => {
		const onKeyDown = (e) => {
			if (
				(e.metaKey || e.ctrlKey) &&
				!e.altKey &&
				!e.shiftKey &&
				e.code === TOGGLE_KEY_CODE
			) {
				e.preventDefault();
				toggle();
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [toggle]);

	return { isOpen, toggle, open, close };
}
