/**
 * Importador genérico da exportação por comanda ou por mesa do Altec
 * (seção 6.2: "se existir exportação por comanda ou mesa, ela alimenta
 * `atendimentos` e destrava attach e giro por mesa"). O formato ainda não
 * foi recebido; as colunas são detectadas por sinônimo: Mesa, Comanda,
 * Abertura/Chegada, Fechamento/Saída, Pessoas/Clientes/Pax, Garçom,
 * Produto/Item, Categoria, Qtde, Total.
 *
 * Linhas de item são agrupadas por comanda (ou por mesa + data + abertura
 * quando não há comanda). Linhas de item sem comanda e sem mesa pertencem
 * ao último atendimento lido (planilhas que só preenchem a primeira linha
 * do grupo). As flags `teveEntrada`, `teveSobremesa` e `teveBebida` vêm da
 * categoria dos itens; sem itens, ou sem coluna de categoria, ficam null
 * (regra 10: nunca zero silencioso).
 *
 * Total do atendimento: a coluna "Total da Comanda" quando existe; senão a
 * soma dos totais dos itens; numa linha sem item, a coluna Total é o total
 * do atendimento.
 */
import { arredondar } from "../motor/numero";
import { lerPeriodoCabecalho, numeroOuNull } from "./altec_r3";
import { classificarCategoria } from "./categorias";
import { parseDataBr, parseHoraBr, parseNumeroBr } from "./numero_br";
import { celula, detectarCabecalhoPorColunas, linhaVazia } from "./tabela";
import { ehTotalizador, lerCodigoENome } from "./texto";
import type { Bloco, MapaColunas, Tabela } from "./tipos";

export const SINONIMOS_COMANDA: Record<string, string[]> = {
  data: ["Data", "Dt", "Data Abertura", "Data da Venda", "Dia", "Data Movimento"],
  mesa: ["Mesa", "Nº Mesa", "Num Mesa", "Número da Mesa"],
  comanda: ["Comanda", "Nº Comanda", "Num Comanda", "Número da Comanda", "Pedido", "Nº Pedido", "Conta", "Cupom", "Venda"],
  abertura: ["Abertura", "Chegada", "Hora Inicial", "Hora Abertura", "Hr Abertura", "Entrada", "Início", "Inicio", "Hora Entrada", "Hora Início"],
  fechamento: ["Fechamento", "Saída", "Saida", "Hora Final", "Hora Fechamento", "Hr Fechamento", "Fim", "Encerramento", "Hora Saída", "Hora Fim"],
  pessoas: ["Pessoas", "Clientes", "Pax", "Qtd Pessoas", "Qtde Pessoas", "Nº Pessoas", "Num Pessoas", "Couvert", "Cobertos", "Lugares"],
  garcom_codigo: ["Cód. Garçom", "Cod Garcom", "Código Garçom", "Cód. Colaborador", "Cód. Atendente", "Cód. Vendedor"],
  garcom: ["Garçom", "Garcom", "Colaborador", "Vendedor", "Atendente", "Funcionário", "Funcionario", "Operador"],
  categoria: ["Categoria", "Grupo", "Segmento", "Setor", "Seção", "Secao", "Departamento"],
  produto: ["Produto", "Item", "Descrição", "Descricao", "Nome do Produto"],
  qtde: ["Qtde", "Qtd", "Quant", "Quantidade", "Qte"],
  total_comanda: ["Total Comanda", "Total da Comanda", "Total Conta", "Total da Conta", "Valor Conta", "Valor da Conta", "Total Mesa", "Total da Mesa"],
  total: ["Total", "Valor", "Vl Total", "Vl. Total", "Valor Total", "Total Item", "Valor Item", "Líquido", "Liquido", "Valor Líquido"],
};

export interface ItemComanda {
  linha: number;
  /** Chave do atendimento ao qual o item pertence. */
  chave: string;
  produto: string;
  categoria: string | null;
  bloco: Bloco | null;
  qtde: number | null;
  total: number | null;
}

export interface Atendimento {
  chave: string;
  data: string | null;
  mesa: string | null;
  comanda: string | null;
  clientes: number | null;
  /** "HH:MM". */
  chegada: string | null;
  saida: string | null;
  teveEntrada: boolean | null;
  teveSobremesa: boolean | null;
  teveBebida: boolean | null;
  garcomCodigo: string | null;
  garcomNome: string | null;
  total: number | null;
  itens: number;
}

export interface ResultadoComandas {
  atendimentos: Atendimento[];
  itens: ItemComanda[];
  avisos: string[];
  linhasLidas: number;
  linhasIgnoradas: number;
  colunas: MapaColunas;
}

interface Acumulado {
  atendimento: Atendimento;
  itens: ItemComanda[];
  totalComanda: number | null;
}

/** Lê a exportação por comanda ou mesa já convertida em tabela de texto (ver `lerTabela`). */
export function lerComandas(entrada: Tabela | string[][]): ResultadoComandas {
  const linhas = Array.isArray(entrada) ? entrada : entrada.linhas;
  const avisos: string[] = [];
  const base: ResultadoComandas = { atendimentos: [], itens: [], avisos, linhasLidas: 0, linhasIgnoradas: 0, colunas: {} };

  const cabecalho = detectarCabecalhoPorColunas(linhas, SINONIMOS_COMANDA, [
    ["comanda", "mesa"],
    ["produto", "total", "total_comanda", "abertura", "pessoas"],
  ]);
  if (!cabecalho) {
    avisos.push('Cabeçalho da exportação por comanda não encontrado: precisa de "Comanda" ou "Mesa" e de produto, total, abertura ou pessoas.');
    return base;
  }
  const { indice, colunas } = cabecalho;
  base.colunas = colunas;
  const temCategoria = colunas.categoria !== undefined;
  if (!temCategoria) avisos.push("Sem coluna de categoria: as flags de entrada, sobremesa e bebida ficam sem dado.");

  const periodoCabecalho = lerPeriodoCabecalho(linhas, indice);
  const dataCabecalho = periodoCabecalho && periodoCabecalho.inicio === periodoCabecalho.fim ? periodoCabecalho.inicio : null;

  const acumulados = new Map<string, Acumulado>();
  const ordem: string[] = [];
  let atual: Acumulado | null = null;
  let lidas = 0;
  let ignoradas = 0;

  for (let i = indice + 1; i < linhas.length; i++) {
    const linha = linhas[i] ?? [];
    if (linhaVazia(linha)) continue;
    lidas++;
    if (linha.some((c) => ehTotalizador(c))) {
      ignoradas++;
      continue;
    }

    const comanda = celula(linha, colunas.comanda) || null;
    const mesa = celula(linha, colunas.mesa) || null;
    const produto = celula(linha, colunas.produto) || null;
    const aberturaTexto = celula(linha, colunas.abertura);
    const fechamentoTexto = celula(linha, colunas.fechamento);
    const data = parseDataBr(celula(linha, colunas.data)) ?? parseDataBr(aberturaTexto) ?? dataCabecalho;
    const chegada = parseHoraBr(aberturaTexto);
    const saida = parseHoraBr(fechamentoTexto);

    let acumulado: Acumulado;
    if (comanda !== null || mesa !== null) {
      const chave = comanda !== null ? `C:${comanda}` : `M:${mesa}|${data ?? ""}|${chegada ?? ""}`;
      const existente = acumulados.get(chave);
      if (existente) {
        acumulado = existente;
      } else {
        acumulado = {
          atendimento: {
            chave,
            data: null,
            mesa: null,
            comanda: null,
            clientes: null,
            chegada: null,
            saida: null,
            teveEntrada: null,
            teveSobremesa: null,
            teveBebida: null,
            garcomCodigo: null,
            garcomNome: null,
            total: null,
            itens: 0,
          },
          itens: [],
          totalComanda: null,
        };
        acumulados.set(chave, acumulado);
        ordem.push(chave);
      }
      atual = acumulado;
      const a = acumulado.atendimento;
      a.data ??= data;
      a.mesa ??= mesa;
      a.comanda ??= comanda;
      a.clientes ??= inteiroOuNull(celula(linha, colunas.pessoas));
      a.chegada ??= chegada;
      a.saida ??= saida;
      const garcom = lerCodigoENome(celula(linha, colunas.garcom_codigo), celula(linha, colunas.garcom));
      a.garcomCodigo ??= garcom.codigo;
      a.garcomNome ??= garcom.nome;
    } else if (atual) {
      acumulado = atual;
    } else {
      avisos.push(`Linha ${i + 1} ignorada: sem comanda nem mesa antes de qualquer atendimento.`);
      ignoradas++;
      continue;
    }

    const totalComandaLinha = numeroOuNull(linha, colunas.total_comanda);
    if (totalComandaLinha !== null) acumulado.totalComanda = totalComandaLinha;

    if (produto !== null) {
      const categoria = temCategoria ? celula(linha, colunas.categoria) || null : null;
      acumulado.itens.push({
        linha: i + 1,
        chave: acumulado.atendimento.chave,
        produto,
        categoria,
        bloco: categoria ? classificarCategoria(categoria).bloco : null,
        qtde: numeroOuNull(linha, colunas.qtde),
        total: numeroOuNull(linha, colunas.total),
      });
    } else if (colunas.total_comanda === undefined) {
      // Linha sem item: a coluna Total é o total do atendimento.
      const total = numeroOuNull(linha, colunas.total);
      if (total !== null) acumulado.totalComanda = total;
    }
  }

  const atendimentos: Atendimento[] = [];
  const itens: ItemComanda[] = [];
  for (const chave of ordem) {
    const acumulado = acumulados.get(chave);
    if (!acumulado) continue;
    const a = acumulado.atendimento;
    a.itens = acumulado.itens.length;
    if (acumulado.itens.length > 0 && temCategoria) {
      a.teveEntrada = acumulado.itens.some((it) => it.bloco === "entrada");
      a.teveSobremesa = acumulado.itens.some((it) => it.bloco === "sobremesa");
      a.teveBebida = acumulado.itens.some((it) => it.bloco === "bar" || it.bloco === "salao");
    }
    if (acumulado.totalComanda !== null) {
      a.total = acumulado.totalComanda;
    } else {
      const totais = acumulado.itens.map((it) => it.total).filter((t): t is number => t !== null);
      a.total = totais.length > 0 ? arredondar(totais.reduce((soma, t) => soma + t, 0), 2) : null;
    }
    atendimentos.push(a);
    itens.push(...acumulado.itens);
  }

  return { atendimentos, itens, avisos, linhasLidas: lidas, linhasIgnoradas: ignoradas, colunas };
}

function inteiroOuNull(texto: string): number | null {
  const n = parseNumeroBr(texto);
  return n === null ? null : Math.round(n);
}
