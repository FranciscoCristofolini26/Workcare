export interface Margens {
  esquerda: number;
  direita: number;
  topo: number;
  base: number;
}

export const LARGURA_GRAFICO = 780;
export const ALTURA_GRAFICO = 300;

/** A margem esquerda acomoda o eixo Y também no celular, onde o rótulo cresce. */
export const MARGENS: Margens = { esquerda: 58, direita: 16, topo: 20, base: 46 };

export const PLOT_X = MARGENS.esquerda;
export const PLOT_Y = MARGENS.topo;
export const PLOT_LARGURA = LARGURA_GRAFICO - MARGENS.esquerda - MARGENS.direita;
export const PLOT_ALTURA = ALTURA_GRAFICO - MARGENS.topo - MARGENS.base;
export const LINHA_BASE = PLOT_Y + PLOT_ALTURA;

/** Coluna com topo arredondado e base reta, ancorada na linha de base. */
export function caminhoColuna(x: number, largura: number, altura: number, raio = 4): string {
  const topo = LINHA_BASE - altura;
  const curva = Math.min(raio, altura, largura / 2);
  if (curva <= 0) {
    return `M${x} ${LINHA_BASE}h${largura}v${-altura}h${-largura}Z`;
  }

  return [
    `M${x} ${LINHA_BASE}`,
    `V${topo + curva}`,
    `a${curva} ${curva} 0 0 1 ${curva} ${-curva}`,
    `h${largura - curva * 2}`,
    `a${curva} ${curva} 0 0 1 ${curva} ${curva}`,
    `V${LINHA_BASE}`,
    'Z',
  ].join('');
}

/** Arredonda o topo da escala para 1, 2 ou 5 vezes uma potência de dez. */
export function escalaAgradavel(maximo: number, divisoes = 4): number {
  if (maximo <= 0) {
    return divisoes;
  }

  const bruto = maximo / divisoes;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const normalizado = bruto / potencia;
  const passo = normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 5 ? 5 : 10;
  return passo * potencia * divisoes;
}

export function marcasDoEixo(topo: number, divisoes = 4): readonly number[] {
  return Array.from({ length: divisoes + 1 }, (_, indice) => (topo / divisoes) * indice);
}

export function alturaDaBarra(valor: number, topo: number): number {
  return topo === 0 ? 0 : (valor / topo) * PLOT_ALTURA;
}

export function posicaoY(valor: number, topo: number): number {
  return LINHA_BASE - alturaDaBarra(valor, topo);
}

export function rotuloHora(hora: number): string {
  return `${hora.toString().padStart(2, '0')}h`;
}
