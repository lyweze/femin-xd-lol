import React, { useRef, useEffect } from "react";
import "./MainPage.css";

function MainPage() {
    const playlistsRef = useRef(null);
    const dragState = useRef({
        isDown: false,
        startX: 0,
        scrollLeft: 0,
        moved: false,
    });

    // Фикс мигания при скролле колесиком на macOS
    useEffect(() => {
        const slider = playlistsRef.current;
        if (!slider) return;

        const onWheel = (e) => {
            if (e.deltaY === 0) return;

            // Если крутим вертикальное колесо — полностью блокируем нативный дерг окна
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                slider.scrollLeft += e.deltaY;
            }
        };

        slider.addEventListener("wheel", onWheel, { passive: false });
        return () => slider.removeEventListener("wheel", onWheel);
    }, []);

    const handleMouseDown = (e) => {
        const slider = playlistsRef.current;
        if (!slider) return;

        dragState.current = {
            isDown: true,
            startX: e.pageX - slider.offsetLeft,
            scrollLeft: slider.scrollLeft,
            moved: false,
        };
    };

    const handleMouseLeaveOrUp = () => {
        dragState.current.isDown = false;
        playlistsRef.current?.classList.remove("is-dragging");
    };

    const handleMouseMove = (e) => {
        const state = dragState.current;
        const slider = playlistsRef.current;
        if (!state.isDown || !slider) return;

        const x = e.pageX - slider.offsetLeft;
        const delta = x - state.startX;

        if (!state.moved && Math.abs(delta) > 5) {
            state.moved = true;
            slider.classList.add("is-dragging");
        }

        if (state.moved) {
            e.preventDefault();
            slider.scrollLeft = state.scrollLeft - delta * 1.4;
        }
    };

    return (
        <main className="main">
            <header className="main-header">
                <h1 className="main-title">Now Playing</h1>
                <p className="main-subtitle">Your favorite tracks</p>
            </header>

            <ul
                className="Playlists"
                ref={playlistsRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeaveOrUp}
                onMouseUp={handleMouseLeaveOrUp}
                onMouseMove={handleMouseMove}
            >
                <li className="Playlist-item">
                    <div className="Playlist-icon" />
                    <span className="Playlist-name">My Playlist 1</span>
                </li>

                <li className="Playlist-item">
                    <div className="Playlist-icon" />
                    <span className="Playlist-name">My Playlist 2</span>
                </li>

                <li className="Playlist-item">
                    <div className="Playlist-icon" />
                    <span className="Playlist-name">My Playlist 3</span>
                </li>

                <li className="Playlist-item">
                    <div className="Playlist-icon" />
                    <span className="Playlist-name">Late Night Mix</span>
                </li>

                <li className="Playlist-item">
                    <div className="Playlist-icon" />
                    <span className="Playlist-name">Synthwave 2026</span>
                </li>

                <li className="Playlist-item">
                    <div className="Playlist-icon" />
                    <span className="Playlist-name">Ambient Focus</span>
                </li>

                <li className="Playlist-item">
                    <div className="Playlist-icon" />
                    <span className="Playlist-name">Mastering Reference</span>
                </li>

                <li className="Playlist-item">
                    <div className="Playlist-icon" />
                    <span className="Playlist-name">Lo-Fi Beats</span>
                </li>

                <li className="Playlist-item">
                    <div className="Playlist-icon" />
                    <span className="Playlist-name">Dark Techno</span>
                </li>

                <li className="Playlist-item">
                    <div className="Playlist-icon" />
                    <span className="Playlist-name">Chillhop Essentials</span>
                </li>

                <li className="Playlist-item">
                    <div className="Playlist-icon" />
                    <span className="Playlist-name">Gym Phonk</span>
                </li>

                <li className="Playlist-item">
                    <div className="Playlist-icon" />
                    <span className="Playlist-name">Coding Session</span>
                </li>
            </ul>

            <ul className="Library" />
        </main>
    );
}

export default MainPage;