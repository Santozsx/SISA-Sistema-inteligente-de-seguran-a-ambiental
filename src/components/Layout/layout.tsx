import { Outlet } from "react-router-dom";
import Sidebar from "../Sidebar/sidebar";
import "./layout.css";

export default function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-conteudo">
        <Outlet />
      </div>
    </div>
  );
}