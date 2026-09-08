/**
 * Componentes base da interface, na identidade QT. Sem cor vibrante, sem
 * sombra. Números sempre em monoespaçada. "sem dado" nunca vira zero.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { SEM_DADO, formatarMoeda, formatarNumero, formatarPercentual, formatarPontos } from "@/formato";
import { formulaPorCodigo } from "@/motor/formulas";

export function Titulo({ children, sub, acoes }: { children: ReactNode; sub?: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-wide">{children}</h1>
        {sub && <div className="mt-1 text-sm text-cinza-escuro">{sub}</div>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

export function Secao({ titulo, children, descricao, acoes }: { titulo: ReactNode; children: ReactNode; descricao?: ReactNode; acoes?: ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-preto pb-2">
        <div>
          <h2 className="text-base font-semibold uppercase tracking-wider">{titulo}</h2>
          {descricao && <div className="text-xs text-cinza-escuro">{descricao}</div>}
        </div>
        {acoes}
      </div>
      {children}
    </section>
  );
}

export function Semaforo({ nivel }: { nivel: string | null | undefined }) {
  const classe = nivel ? `semaforo-${nivel}` : "semaforo-nulo";
  const nomes: Record<string, string> = { otimo: "ótimo", atencao: "atenção", alerta: "alerta", critico: "crítico" };
  return <span className={`semaforo ${classe}`} title={nivel ? nomes[nivel] : "sem dado"} aria-label={nivel ? nomes[nivel] : "sem dado"} />;
}

export type TipoValor = "pct" | "pp" | "reais" | "numero" | "dia" | "min" | "meses" | "texto";

export function valorFormatado(valor: number | null | undefined, tipo: TipoValor, casas?: number): string {
  if (valor === null || valor === undefined) return SEM_DADO;
  switch (tipo) {
    case "pct":
      return formatarPercentual(valor, casas ?? 1);
    case "pp":
      return formatarPontos(valor, casas ?? 1);
    case "reais":
      return formatarMoeda(valor);
    case "dia":
      return `dia ${formatarNumero(valor, 0)}`;
    case "min":
      return `${formatarNumero(valor, 0)} min`;
    case "meses":
      return `${formatarNumero(valor, 1)} meses`;
    case "numero":
      return formatarNumero(valor, casas ?? 1, 0);
    default:
      return String(valor);
  }
}

/**
 * Indicador com valor, semáforo, meta e fórmula num toque (regra 7).
 * Sem dado, mostra o que falta lançar (regra 10).
 */
export function Indicador({
  codigo,
  nome,
  valor,
  tipo,
  meta,
  semaforo,
  falta,
  detalhe,
  casas,
  href,
}: {
  codigo?: string;
  nome: string;
  valor: number | null | undefined;
  tipo: TipoValor;
  meta?: number | null;
  semaforo?: string | null;
  falta?: string | null;
  detalhe?: string | null;
  casas?: number;
  href?: string;
}) {
  const formula = codigo ? formulaPorCodigo(codigo) : undefined;
  const semDado = valor === null || valor === undefined;
  return (
    <details className="group border border-cinza-claro bg-branco p-3">
      <summary className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs uppercase tracking-wider text-cinza-escuro">{nome}</div>
          <div className={`num mt-1 text-xl ${semDado ? "text-cinza" : ""}`}>{valorFormatado(valor, tipo, casas)}</div>
          {semDado && falta && <div className="mt-1 text-xs text-cinza-escuro">falta: {falta}</div>}
          {!semDado && detalhe && <div className="mt-1 text-xs text-cinza-escuro">{detalhe}</div>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Semaforo nivel={semDado ? null : semaforo} />
          {meta !== null && meta !== undefined && <div className="num text-[11px] text-cinza-escuro">meta {valorFormatado(meta, tipo === "pp" ? "pct" : tipo, casas)}</div>}
        </div>
      </summary>
      <div className="mt-3 border-t border-cinza-claro pt-2 text-xs text-cinza-escuro">
        {formula ? (
          <>
            <div className="num text-preto">{formula.formula}</div>
            <div className="mt-1">
              Seção {formula.secao} · dono: {formula.dono} · origem: {formula.origem} · {formula.frequencia.replace("_", " ")}
            </div>
            {semDado && <div className="mt-1">Destrava com: {falta ?? formula.faltaQuando}</div>}
          </>
        ) : (
          <div>{falta ?? "Fórmula na seção 5 da especificação."}</div>
        )}
        {href && (
          <Link href={href} className="mt-2 inline-block underline">
            abrir
          </Link>
        )}
      </div>
    </details>
  );
}

export function SemDado({ falta, children }: { falta?: string | null; children?: ReactNode }) {
  return (
    <div className="border border-dashed border-cinza p-4 text-sm text-cinza-escuro">
      <span className="font-medium text-preto">sem dado</span>
      {falta && <span>. Falta lançar: {falta}</span>}
      {children}
    </div>
  );
}

export function Aviso({ children, nivel = "alerta" }: { children: ReactNode; nivel?: "alerta" | "critico" | "info" }) {
  const borda = nivel === "critico" ? "border-preto bg-preto text-papel" : nivel === "alerta" ? "border-preto" : "border-cinza";
  return <div className={`border p-3 text-sm ${borda}`}>{children}</div>;
}

export function Grade({ children, colunas = 3 }: { children: ReactNode; colunas?: 2 | 3 | 4 }) {
  const classe = colunas === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : colunas === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return <div className={`grid grid-cols-1 gap-3 ${classe}`}>{children}</div>;
}

export function Tabela({ cabecalho, children, vazio }: { cabecalho: Array<{ rotulo: string; num?: boolean }>; children: ReactNode; vazio?: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="tabela">
        <thead>
          <tr>
            {cabecalho.map((c) => (
              <th key={c.rotulo} className={c.num ? "num" : undefined}>
                {c.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {vazio}
    </div>
  );
}

export function Td({ children, num, className }: { children: ReactNode; num?: boolean; className?: string }) {
  return <td className={`${num ? "num" : ""} ${className ?? ""}`}>{children}</td>;
}

export function Campo({ rotulo, children, ajuda }: { rotulo: string; children: ReactNode; ajuda?: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{rotulo}</span>
      <div className="mt-1">{children}</div>
      {ajuda && <div className="mt-1 text-xs text-cinza-escuro">{ajuda}</div>}
    </label>
  );
}

export function BotaoLink({ href, children, secundario }: { href: string; children: ReactNode; secundario?: boolean }) {
  return (
    <Link href={href} className={secundario ? "botao-secundario" : "botao"}>
      {children}
    </Link>
  );
}

export function Mensagem({ texto, erro }: { texto?: string | null; erro?: string | null }) {
  if (erro) return <Aviso nivel="alerta">{erro}</Aviso>;
  if (texto) return <Aviso nivel="info">{texto}</Aviso>;
  return null;
}
