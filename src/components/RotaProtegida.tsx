import { Navigate, Outlet, useLocation } from "react-router-dom";
import { estaLogado } from "../services/api";

// Só deixa entrar nas telas internas quem tem token; os demais vão para o login.
export default function RotaProtegida() {
  const local = useLocation();
  if (!estaLogado()) {
    return <Navigate to="/login" replace state={{ voltarPara: local.pathname + local.search }} />;
  }
  return <Outlet />;
}
