import { parametrosDaCasa } from "@/lib/dados/hoje";
import { Campo, Secao, Titulo } from "@/componentes/ui";
import { Formulario } from "@/componentes/formulario";
import { salvarParametros } from "../acoes";
import { CalculadoraSimples } from "./simples";

export const metadata = { title: "Parâmetros" };

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export default async function PaginaParametros() {
  const p = (await parametrosDaCasa()) ?? {};
  const v = (x: unknown) => (x === null || x === undefined ? "" : String(x).replace(".", ","));
  const pct = (x: unknown) => (x === null || x === undefined ? "" : String(Math.round(Number(x) * 10000) / 100).replace(".", ","));
  const dias = (p.dias_operacao as number[] | undefined) ?? [0, 2, 3, 4, 5, 6];
  return (
    <>
      <Titulo sub="uma linha por unidade · percentuais informados como 13 ou 0,13">Parâmetros da casa</Titulo>
      <Formulario acao={salvarParametros} rotuloBotao="Salvar parâmetros">
        <Secao titulo="Operação">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Campo rotulo="Cadeiras"><input name="cadeiras" className="campo num" inputMode="numeric" defaultValue={v(p.cadeiras)} /></Campo>
            <Campo rotulo="Mesas"><input name="mesas" className="campo num" inputMode="numeric" defaultValue={v(p.mesas)} /></Campo>
            <Campo rotulo="Horas de serviço"><input name="horas_servico" className="campo num" inputMode="decimal" defaultValue={v(p.horas_servico)} /></Campo>
            <Campo rotulo="Cozinheiros por turno"><input name="cozinheiros_padrao" className="campo num" inputMode="numeric" defaultValue={v(p.cozinheiros_padrao ?? 4)} /></Campo>
            <Campo rotulo="Taxa de serviço (%)"><input name="taxa_servico_pct" className="campo num" inputMode="decimal" defaultValue={pct(p.taxa_servico_pct ?? 0.13)} /></Campo>
            <Campo rotulo="Fator de segurança padrão" ajuda="1,05 a 1,10; item de alta variação 1,15"><input name="fator_seguranca_padrao" className="campo num" inputMode="decimal" defaultValue={v(p.fator_seguranca_padrao ?? 1.1)} /></Campo>
            <Campo rotulo="Alerta de documento (dias)"><input name="alerta_documento_dias" className="campo num" inputMode="numeric" defaultValue={v(p.alerta_documento_dias ?? 60)} /></Campo>
            <Campo rotulo="Fator de popularidade" ajuda="engenharia de cardápio, padrão 0,70"><input name="fator_popularidade" className="campo num" inputMode="decimal" defaultValue={v(p.fator_popularidade ?? 0.7)} /></Campo>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {DIAS.map((d, i) => (
              <label key={d} className="flex items-center gap-1"><input type="checkbox" name={`dia:${i}`} defaultChecked={dias.includes(i)} /> {d}</label>
            ))}
          </div>
        </Secao>
        <Secao titulo="Tributação e pagamento" descricao="Simples Nacional, Anexo I: alíquota efetiva pela receita dos doze meses anteriores (RBT12). Com doze meses de fechamento importados, o RBT12 é calculado; até lá, informe.">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Campo rotulo="Regime"><select name="regime_tributario" className="campo" defaultValue={String(p.regime_tributario ?? "simples_nacional")}><option value="simples_nacional">Simples Nacional</option><option value="outro">outro (informe a alíquota)</option></select></Campo>
            <Campo rotulo="Anexo"><input name="simples_anexo" className="campo" defaultValue={String(p.simples_anexo ?? "I")} /></Campo>
            <Campo rotulo="RBT12 informado (R$)" ajuda="receita bruta dos últimos 12 meses"><input name="rbt12_manual" className="campo num" inputMode="decimal" defaultValue={v(p.rbt12_manual)} /></Campo>
            <Campo rotulo="Alíquota fixa (%)" ajuda="preenchida, sobrepõe o cálculo do Simples"><input name="imposto_pct" className="campo num" inputMode="decimal" defaultValue={pct(p.imposto_pct)} /></Campo>
            <Campo rotulo="Taxa média de pagamento (%)" ajuda="referência 3,5%, a confirmar com a adquirente"><input name="taxa_pagamento_pct" className="campo num" inputMode="decimal" defaultValue={pct(p.taxa_pagamento_pct)} /></Campo>
          </div>
          <div className="mt-4"><CalculadoraSimples /></div>
        </Secao>
        <Secao titulo="Forno" descricao="capacidade medida, nunca extrapolada: soma das quatro faixas de 15 minutos de uma hora cheia de pico">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo rotulo="Pizzas por hora cheia de pico"><input name="forno_pizzas_hora" className="campo num" inputMode="numeric" defaultValue={v(p.forno_pizzas_hora)} /></Campo>
            <Campo rotulo="Pico de 15 minutos"><input name="forno_pico_15min" className="campo num" inputMode="numeric" defaultValue={v(p.forno_pico_15min)} /></Campo>
          </div>
        </Secao>
      </Formulario>
    </>
  );
}
