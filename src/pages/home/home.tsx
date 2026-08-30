import "./home.css"
export default function Home() {
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
                    <div className="title-right-side">
                        <h1 className="rihgt-side-h1">Entrar</h1>

                        <p className="rihgt-side-p">Acesse com as credenciais do seu instituto</p>

                        <p className="right-input-p">E-mail institucional:</p>

                        <input className="input-email-password" type="" placeholder="contato@institutoxyz.org" />

                        <p className="right-input-p">Senha:</p>

                        <input className="input-email-password" type="" placeholder="******" />

                        <button className="button-login">Entrar</button>

                        <p className="rihgt-side-bottom-p">Ainda não possui uma conta? <span className="destaque">Cadastrar agora</span></p>

                    </div>
                </div>
            </div>
        </div>
    );

}