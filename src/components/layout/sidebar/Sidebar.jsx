import React from "react";
import "./Sidebar.css";

function Sidebar() {
	return (
		<div className="sidebar">
			<ul className="sidebar-navigation">
				<li className="main-li">
					<ul>
						<li>Home</li>
						<li>Library</li>
					</ul>
				</li>

				<li className="library-li">
					<ul>
						<li>Favourites</li>
						<li>Playlist 1</li>
						<li>Playlist 2</li>
					</ul>
				</li>
			</ul>
		</div>
	);
}

export default Sidebar;
