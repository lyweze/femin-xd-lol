// ============================================================================
// Импорты: роутинг, хук состояния сайдбара и боковая панель
// ============================================================================
import { Outlet, useLocation } from "react-router-dom";
import { useSidebar } from "../../hooks/useSidebar.js";
import Sidebar from "./sidebar/Sidebar.jsx";

/**
 * Постоянный каркас приложения (`PlayerLayout`).
 * Удерживает левую панель навигации (`Sidebar`), боковую полосу возврата
 * при свёрнутом меню и контейнер рабочей области с анимацией переходов.
 */
function PlayerLayout() {
    const location = useLocation();
    const { isOpen: isSidebarOpen, toggle: toggleSidebar } = useSidebar(true);

    return (
        <div className="app">
            {/* Узкая интерактивная полоса слева для возврата скрытого сайдбара */}
            {!isSidebarOpen && (
                <button
                    type="button"
                    className="sidebar-reopen-strip"
                    onClick={toggleSidebar}
                    title="Show sidebar (⌘\)"
                    aria-label="Show sidebar"
                />
            )}

            {/* Постоянная боковая панель навигации */}
            <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />

            {/* Правая рабочая область со сменой экранов */}
            <main className="main">
                <div className="page-transition" key={location.pathname}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

export default PlayerLayout;
