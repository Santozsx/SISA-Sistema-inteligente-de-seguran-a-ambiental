import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout/layout";
import Home from "./pages/Home/home";
import Institutos from "./pages/Institutos/instituto.tsx";
import Mensagens from "./pages/Mensagens/mensagens";
// import Login from "./pages/Login/login"; // adicione a rota abaixo quando essa página estiver pronta

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* <Route path="/login" element={<Login />} /> */}
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/institutos" element={<Institutos />} />
          <Route path="/mensagens" element={<Mensagens />} />
          {/* Adicione /chamados e /config aqui assim que criar essas páginas em src/pages */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}