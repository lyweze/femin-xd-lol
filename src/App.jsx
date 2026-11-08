import { useState } from "react";
import "./App.css";
import Sidebar from "./components/sidebar/Sidebar.jsx";
import MainPage from "./components/main-page/MainPage.jsx";

function App() {
	const [count, setCount] = useState(0);

	return (
		<div className="app">
			<Sidebar />
			<MainPage />
		</div>
	);
}

export default App;
