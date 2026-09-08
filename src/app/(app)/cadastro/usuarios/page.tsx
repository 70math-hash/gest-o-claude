import { listarUsuarios } from "@/lib/dados/cadastro_detalhe";
import { sessaoAtual } from "@/lib/sessao";
import { Aviso, Campo, Secao, Tabela, Td, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { autorizarUsuario, removerAutorizacao } from "../acoes";

export const metadata = { title: "Usuários" };

export default async function PaginaUsuarios() {
  const [usuarios, sessao] = await Promise.all([listarUsuarios(), sessaoAtual()]);
  const dono = sessao.perfil === "dono";
  return (
    <>
      <Titulo sub="Login por link no e-mail, sem senha. Só entram e-mails desta lista, cada um com seu perfil.">Usuários</Titulo>
      {dono ? (
        <Secao titulo="Autorizar e-mail">
          <Formulario acao={autorizarUsuario} rotuloBotao="Autorizar" className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="E-mail"><input type="email" name="email" className="campo" required /></Campo>
            <Campo rotulo="Nome"><input name="nome" className="campo" /></Campo>
            <Campo rotulo="Perfil"><select name="perfil" className="campo"><option value="gestor">gestor</option><option value="cozinha">cozinha</option><option value="salao">salão</option><option value="dono">dono</option></select></Campo>
          </Formulario>
        </Secao>
      ) : (
        <Aviso nivel="info">Só o dono autoriza usuários.</Aviso>
      )}
      <Secao titulo="Autorizados">
        <Tabela cabecalho={[{ rotulo: "E-mail" }, { rotulo: "Nome" }, { rotulo: "Perfil" }, { rotulo: "Já entrou" }, { rotulo: "" }]}>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <Td>{u.email}</Td><Td>{u.nome ?? ""}</Td><Td>{u.perfil}</Td><Td>{u.entrou ? "sim" : "ainda não"}</Td>
              <Td>{dono && u.email.toLowerCase() !== sessao.email.toLowerCase() && <form action={removerAutorizacao.bind(null, u.id)}><button className="text-xs underline">remover</button></form>}</Td>
            </tr>
          ))}
        </Tabela>
      </Secao>
    </>
  );
}
