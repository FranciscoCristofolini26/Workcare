export interface GeradorAleatorio {
  proximo(): number;
  inteiro(minimo: number, maximo: number): number;
  item<T>(lista: readonly T[]): T;
  chance(probabilidade: number): boolean;
}

export function criarGeradorAleatorio(semente: number): GeradorAleatorio {
  let estado = semente >>> 0;

  const proximo = (): number => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let valor = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    valor = (valor + Math.imul(valor ^ (valor >>> 7), 61 | valor)) ^ valor;
    return ((valor ^ (valor >>> 14)) >>> 0) / 4294967296;
  };

  return {
    proximo,
    inteiro: (minimo, maximo) => Math.floor(proximo() * (maximo - minimo + 1)) + minimo,
    item: (lista) => lista[Math.floor(proximo() * lista.length)],
    chance: (probabilidade) => proximo() < probabilidade,
  };
}
