import './App.css'

function App() {
  return (
    <div className="shell">

      <div className="side">

        <div className="brand">
          <span className="brand-dot"></span>
          <span className="brand-name">Sentinela</span>
          <span className="brand-sub">
            Sistema Inteligente de Segurança Ambiental
          </span>
        </div>

        <div className="eyebrow">
          Novo registro
        </div>

        <h2>
          Todo dado é cifrado antes de sair do seu dispositivo.
        </h2>

        <div className="desc">
          Preencha as informações da ocorrência. O conteúdo é
          protegido com a chave do seu instituto antes de ser salvo.
        </div>

      </div>

      <div className="form-side">

        <h2>Novo registro</h2>

        <div className="sub">
          Registre um dado ambiental identificado em campo
        </div>

        <div className="field">
          <label>Categoria</label>

          <select>
            <option></option>
            <option></option>
            <option></option>
            <option></option>
          </select>
        </div>

        <div className="field">
          <label>Descrição do ocorrido</label>

          <textarea
            rows="3"
            placeholder="Descreva o que foi identificado..."
          ></textarea>
        </div>

        <div className="field">
          <label>Local / coordenadas</label>

          <input
            type="text"
            placeholder="Ex: -23.55, -46.63"
          />
        </div>

        <div className="field">
          <label>Anexo (imagem ou dado)</label>

          <input
            type="text"
            placeholder="upload_evidencia.jpg"
          />
        </div>

        <div className="crypt-note">
          🔒 Este registro será cifrado com a chave do seu instituto
          antes do envio
        </div>

        <button className="btn-primary">
          Cifrar e enviar registro
        </button>

      </div>

    </div>
  )
}

export default App