import { readFileSync } from 'node:fs';

/**
 * Decisao B5 do Bloco 9 -- o campo de data muda de NOME, e nao de
 * comportamento.
 *
 * O defeito nao era o valor preenchido: era o rotulo. O campo se chamava "Data
 * do documento" e a pessoa lia "data do exame", entao preenchia com hoje sem
 * perceber que estava afirmando quando o exame foi feito. Um laudo de
 * 04/10/2025 entrou como 18/09/2026 exatamente assim.
 *
 * As tres alternativas recusadas estao na spec (§5.2): deixar o campo vazio
 * (fricao em todo upload), a extracao sobrescrever o formulario (contraria a
 * D24, e um laudo consolidado nao tem UMA data de coleta), e nao fazer nada.
 *
 * Varredura de fonte, e nao renderizacao: o rotulo e a mesma decisao nas duas
 * telas que editam o documento, e um teste por tela protegeria uma e deixaria
 * a outra para tras -- que foi como as duas acabaram com o mesmo rotulo errado.
 */
const TELAS_QUE_EDITAM_O_DOCUMENTO = [
  'src/screens/AddExamScreen.tsx',
  'src/screens/DocumentDetailScreen.tsx',
];

const fonte = (caminho: string) => readFileSync(caminho, 'utf8');

describe('o rotulo do campo de data (B5)', () => {
  it.each(TELAS_QUE_EDITAM_O_DOCUMENTO)('%s nao chama mais o campo de "Data do documento"', (t) => {
    expect(fonte(t)).not.toContain('Data do documento');
  });

  it.each(TELAS_QUE_EDITAM_O_DOCUMENTO)('%s diz o que o campo E, por tipo', (t) => {
    const texto = fonte(t);
    // Exame: a data do exame vem do laudo, e o formulario guarda quando a
    // pessoa registrou. Receita: a data da receita e dela, e a pessoa a sabe.
    expect(texto).toContain('Guardado em');
    expect(texto).toContain('Data da receita');
  });

  it('o formulario CONTINUA preenchendo com hoje', () => {
    // A B5 mudou o nome, nao o comportamento -- e esta assercao existe para
    // ninguem "consertar" o preenchimento depois achando que ele era o
    // defeito. A conveniencia de quem digitaliza um exame recem-feito fica.
    expect(fonte('src/screens/AddExamScreen.tsx')).toContain('useState(() => getTodayDate())');
  });
});
