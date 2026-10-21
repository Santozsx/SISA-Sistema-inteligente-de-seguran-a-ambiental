import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { login } from "../../services/api";
import "./login.css"

interface EstadoLogin {
    voltarPara?: string;
    email?: string;
    mensagem?: string;
}

export default function Login() {
    const navigate = useNavigate();
    const estado = (useLocation().state ?? {}) as EstadoLogin;

    const [email, setEmail] = useState(estado.email ?? "");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState("");
    const [carregando, setCarregando] = useState(false);

    async function entrar(evento: FormEvent) {
        evento.preventDefault();
        setErro("");
        setCarregando(true);
        try {
            await login(email.trim(), senha);
            navigate(estado.voltarPara ?? "/home", { replace: true });
        } catch (e) {
            setErro((e as Error).message);
        } finally {
            setCarregando(false);
        }
    }

    return (


        <div className="background-wrapper">

            <div className="glow-light glow-top-left"></div>

            <div className="glow-light glow-bottom-right"></div>

            {/* header da pagina */}
            <header className="header">
                <span className="span-dot"></span>
                <h1 className="header-h1">SISA <span className="header-span">Sistema inteligente de segurança ambiental</span></h1>
            </header>

            {/* container principal */}
            <div className="container">
                {/* Container lado esquerdo */}
                <div className="container-left">

                    <div className="title-left-side">
                        <p className="title-left-side-p">ACESSO RESTRITO</p>
                        <h1 className="left-side-h1">Acesso exclusivo. <br/>Somente institutos<br/> verificados.</h1>
                    </div>


                </div>

                {/* container lado direito */}
                <div className="container-right">
                    <form className="title-right-side" onSubmit={entrar}>
                        <h1 className="rihgt-side-h1">Entrar</h1>

                        <p className="rihgt-side-p">Acesse com as credenciais do seu instituto</p>

                        {estado.mensagem && !erro && <p className="aviso aviso--sucesso">{estado.mensagem}</p>}
                        {erro && <p className="aviso aviso--erro">{erro}</p>}

                        <p className="right-input-p">E-mail institucional:</p>

                        <input
                            className="input-email-password"
                            type="email"
                            placeholder="contato@institutoxyz.org"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <p className="right-input-p">Senha:</p>

                        <input
                            className="input-email-password"
                            type="password"
                            placeholder="******"
                            autoComplete="current-password"
                            required
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                        />

                        <button className="button-login" type="submit" disabled={carregando}>
                            {carregando ? "Entrando..." : "Entrar"}
                        </button>

                       <p className="rihgt-side-bottom-p">Ainda não possui uma conta? <Link className="destaque" to="/cadastro">Cadastrar agora</Link></p>

                    </form>
                </div>
            </div>
        </div>
    );

}
