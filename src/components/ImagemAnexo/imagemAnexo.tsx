import { useEffect, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { urlImagemAnexo, type Anexo } from "../../services/api";

interface Props {
  anexo: Anexo;
  className?: string;
}

// Mostra a imagem de um anexo protegido (a rota exige o token, por isso não dá para usar a url direto no <img>).
export default function ImagemAnexo({ anexo, className }: Props) {
  const [resultado, setResultado] = useState<{ id: number; url: string | null } | null>(null);

  useEffect(() => {
    let ativo = true;
    let criada: string | null = null;
    urlImagemAnexo(anexo)
      .then((url) => {
        criada = url;
        if (ativo) setResultado({ id: anexo.id, url });
        else URL.revokeObjectURL(url);
      })
      .catch(() => ativo && setResultado({ id: anexo.id, url: null }));
    return () => {
      ativo = false;
      if (criada) URL.revokeObjectURL(criada);
    };
  }, [anexo]);

  const atual = resultado?.id === anexo.id ? resultado : null;
  if (!atual?.url) {
    return (
      <div className={`${className ?? ""} imagem-anexo--carregando`} aria-busy={atual === null}>
        <ImageIcon size={22} />
      </div>
    );
  }
  return <img className={className} src={atual.url} alt={anexo.nome_arquivo} loading="lazy" />;
}
