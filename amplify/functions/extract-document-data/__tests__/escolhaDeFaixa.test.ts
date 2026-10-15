/**
 * F4 -- a fronteira entre transcrever e interpretar, medida em vez de suposta.
 *
 * O achado que originou este arquivo e uma frase real, devolvida pela extracao
 * em 2026-09-19: "Vitamina C: intervalo difere por sexo; foi utilizado o
 * intervalo masculino pois o paciente e do sexo masculino." O modelo escolheu
 * uma linha da tabela, e declarou a escolha -- em prosa, dentro de `warnings`,
 * onde nenhuma tela le e nenhum teste olhava.
 *
 * O que este modulo faz e CONTAR, nao reprovar. Descartar a extracao inteira
 * por causa de uma palavra repetiria o erro da R2 que o Bloco 8 consertou. A
 * instrucao esta no prompt; o numero diz se ela foi obedecida.
 */
import { contarEscolhasDeFaixa } from '../escolhaDeFaixa';

describe('contarEscolhasDeFaixa', () => {
  it('reconhece a frase real medida em 2026-09-19', () => {
    const avisos = [
      'Vitamina C: intervalo difere por sexo; foi utilizado o intervalo masculino pois o paciente e do sexo masculino.',
    ];
    expect(contarEscolhasDeFaixa(avisos)).toBe(1);
  });

  it('reconhece a escolha por idade e por grupo, que sao a mesma familia', () => {
    expect(
      contarEscolhasDeFaixa([
        'A faixa de referencia foi escolhida pela idade do paciente.',
        'Adotamos o intervalo do grupo de risco indicado no laudo.',
      ]),
    ).toBe(2);
  });

  it('NAO conta aviso comum da leitura -- este detector nao pode virar ruido', () => {
    // Todos estes sao avisos legitimos que a extracao ja produz hoje. Se eles
    // contassem, o numero perderia o sentido e ninguem olharia mais para ele.
    expect(
      contarEscolhasDeFaixa([
        'A data de coleta de "Glicose" nao estava legivel no documento; usamos a data informada no formulario.',
        'Laudo descritivo, sem valores numericos.',
        'Nao conseguimos identificar de qual exame sao estes valores.',
        'O documento trouxe 2 leituras para o mesmo codigo no mesmo momento de coleta.',
      ]),
    ).toBe(0);
  });

  it('NAO conta a simples MENCAO de que a faixa varia -- isso e transcricao', () => {
    // "A faixa difere por sexo" descreve o papel. Vira achado quando o modelo
    // diz que USOU uma delas.
    expect(contarEscolhasDeFaixa(['O laudo apresenta faixa por sexo e por idade.'])).toBe(0);
  });

  it('lista vazia e zero, e nao uma excecao', () => {
    expect(contarEscolhasDeFaixa([])).toBe(0);
  });
});
