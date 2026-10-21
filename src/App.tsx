import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout/layout";
import RotaProtegida from "./components/RotaProtegida";
import Home from "./pages/home/home";
import Institutos from "./pages/Institutos/instituto.tsx";
import Mensagens from "./pages/Mensagens/mensagens";
import Cadastro from "./pages/Cadastro/cadastro.tsx";
import Login from "./pages/Login/login";
import Chamados from "./pages/Chamados/chamados.tsx";
import Registro from "./pages/Registro/registro.tsx";
import Config from "./pages/config/config.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Página inicial redireciona para o login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Telas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />

        {/* Telas que exigem login */}
        <Route element={<RotaProtegida />}>
          <Route path="/registro" element={<Registro />} />

          {/* Telas com sidebar */}
          <Route element={<Layout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/institutos" element={<Institutos />} />
            <Route path="/chamados" element={<Chamados />} />
            <Route path="/mensagens" element={<Mensagens />} />
            <Route path="/config" element={<Config />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
