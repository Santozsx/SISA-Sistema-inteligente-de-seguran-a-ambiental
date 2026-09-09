import { NavLink } from "react-router-dom";
import {
  Satellite,
  LayoutGrid,
  MapPin,
  MessageSquare,
  TriangleAlert,
  Settings,
} from "lucide-react";
import "./sidebar.css";

const NAV_ITEMS = [
  { to: "/home", label: "Mural", icon: LayoutGrid },
  { to: "/institutos", label: "Institutos", icon: MapPin },
  { to: "/mensagens", label: "Mensagens", icon: MessageSquare },
  { to: "/chamados", label: "Chamados", icon: TriangleAlert },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-icone">
          <Satellite size={16} />
        </span>
        <span className="sidebar-logo-texto">SISA</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icone = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-nav-item${isActive ? " sidebar-nav-item--ativo" : ""}`
              }
            >
              <Icone size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <NavLink
        to="/config"
        className={({ isActive }) =>
          `sidebar-nav-item sidebar-config${
            isActive ? " sidebar-nav-item--ativo" : ""
          }`
        }
      >
        <Settings size={16} />
        <span>Config</span>
      </NavLink>
    </aside>
  );
}