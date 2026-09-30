import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout/layout";
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
        {/* Telas completas, sem sidebar */}
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/registro" element={<Registro />} />

        {/* Telas com sidebar */}
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/institutos" element={<Institutos />} />
          <Route path="/chamados" element={<Chamados />} />
          <Route path="/mensagens" element={<Mensagens />} />
          <Route path="/config" element={<Config />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}