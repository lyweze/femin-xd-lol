import { useState, useEffect, useCallback } from "react";
import { readStorageJson, writeStorageJson } from "../utils/storage.js";

// ============================================================================
// Константы хранения состояния и горячих клавиш сайдбара
// ============================================================================
const STORAGE_KEY = "matte_obsidian_sidebar_open";
const TOGGLE_KEY_CODE = "Backslash"; // Физическая клавиша `\` (работает в любой раскладке)

const isBoolean = (value) => typeof value === "boolean";

/**
 * Хук управления открытостью боковой панели (`Sidebar`).
 *
 * Возможности:
 * 1. Восстанавливает и сохраняет состояние в `localStorage` между сессиями.
 * 2. Поддерживает глобальный шорткат `Cmd + \` (macOS) и `Ctrl + \` (Windows/Linux).
 * 3. Возвращает флаг `isOpen` и стабильные методы `toggle`, `open`, `close`.
 */
export function useSidebar(defaultOpen = true) {
	const [isOpen, setIsOpen] = useState(() =>
		readStorageJson(STORAGE_KEY, defaultOpen, isBoolean),
	);

	const updateState = useCallback((updater) => {
		setIsOpen((prev) => {
			const next = typeof updater === "function" ? updater(prev) : updater;
			writeStorageJson(STORAGE_KEY, next);
			return next;
		});
	}, []);

	const toggle = useCallback(() => updateState((prev) => !prev), [updateState]);
	const open = useCallback(() => updateState(true), [updateState]);
	const close = useCallback(() => updateState(false), [updateState]);

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
