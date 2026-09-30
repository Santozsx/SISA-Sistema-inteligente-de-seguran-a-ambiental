import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./registro.css";

export default function Registro() {
  const [enviado, setEnviado] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="registro-pagina">
      <div className="registro-shell">
        <div className="registro-lateral">
          <div className="registro-marca">
            <span className="registro-marca-ponto"></span>
            <span className="registro-marca-nome">Sentinela</span>
            <span className="registro-marca-sub">
              Sistema Inteligente de Segurança Ambiental
            </span>
          </div>

          <div className="registro-etiqueta">Novo registro</div>

          <h2 className="registro-lateral-titulo">
            Todo dado é cifrado antes de sair do seu dispositivo.
          </h2>

          <div className="registro-descricao">
            Preencha as informações da ocorrência. O conteúdo é protegido com a
            chave do seu instituto antes de ser salvo.
          </div>
        </div>

        <div className="registro-formulario">
          <h2 className="registro-formulario-titulo">Novo registro</h2>

          <div className="registro-subtitulo">
            Registre um dado ambiental identificado em campo
          </div>

          <div className="registro-campo">
            <label>Categoria</label>

            <select>
              <option></option>
              <option></option>
              <option></option>
              <option></option>
            </select>
          </div>

          <div className="registro-campo">
            <label>Descrição do ocorrido</label>

            <textarea
              rows={3}
              placeholder="Descreva o que foi identificado..."
            ></textarea>
          </div>

          <div className="registro-campo">
            <label>Local / coordenadas</label>

            <input type="text" placeholder="Ex: -23.55, -46.63" />
          </div>

          <div className="registro-campo">
            <label>Anexo (imagem ou dado)</label>

            <input type="text" placeholder="upload_evidencia.jpg" />
          </div>

          <div className="registro-aviso-cifra">
            🔒 Este registro será cifrado com a chave do seu instituto antes do
            envio
          </div>

          <button className="registro-botao" onClick={() => setEnviado(true)}>
            Cifrar e enviar registro
          </button>
        </div>
      </div>

      {enviado && (
        <div className="registro-modal-fundo">
          <div className="registro-modal">
            <div className="registro-modal-icone">✓</div>

            <h3 className="registro-modal-titulo">Registro enviado</h3>

            <button
              className="registro-botao"
              onClick={() => navigate("/home")}
            >
              Voltar para a home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}