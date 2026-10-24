/**
 * Resumo do arquivo:
 * O template CloudFormation da pesquisa da feira (infra/site-pesquisa/template.json).
 * Nao ha como implantar em teste, entao este arquivo trava o que importa: a
 * Lambda e publica, entao tem de ter permissao minima, concorrencia limitada e
 * CORS so para o site; a senha do painel nunca pode ter valor padrao no
 * template; a tabela com as respostas nao pode sumir se a stack for apagada.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

type Recurso = { Type: string; Properties?: Record<string, any>; DeletionPolicy?: string; UpdateReplacePolicy?: string };

const template = JSON.parse(readFileSync(path.join(__dirname, '..', 'infra', 'site-pesquisa', 'template.json'), 'utf8'));
const recursos: Record<string, Recurso> = template.Resources;

const doTipo = (tipo: string): [string, Recurso][] => Object.entries(recursos).filter(([, r]) => r.Type === tipo);
const unico = (tipo: string): Recurso => {
  const achados = doTipo(tipo);
  if (achados.length !== 1) throw new Error(`Esperava 1 recurso ${tipo}, achei ${achados.length}`);
  return achados[0][1];
};

describe('template da pesquisa da feira', () => {
  it('tem a tabela de respostas sob demanda, com chave id, e ela sobrevive a exclusao da stack', () => {
    const tabela = unico('AWS::DynamoDB::Table');
    expect(tabela.Properties).toMatchObject({
      TableName: 'suasaude-feira-respostas',
      BillingMode: 'PAY_PER_REQUEST',
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
    });
    expect(tabela.DeletionPolicy).toBe('Retain');
    expect(tabela.UpdateReplacePolicy).toBe('Retain');
  });

  it('a Function URL e publica, mas o CORS vale so para o site, com POST e os dois cabecalhos', () => {
    const url = unico('AWS::Lambda::Url');
    expect(url.Properties?.AuthType).toBe('NONE');
    expect(url.Properties?.Cors).toMatchObject({
      AllowOrigins: ['https://main.d3fx6eabnu0fdd.amplifyapp.com'],
      AllowMethods: ['POST'],
      AllowCredentials: false,
    });
    expect([...url.Properties?.Cors.AllowHeaders].sort()).toEqual(['content-type', 'x-chave']);
  });

  it('a Lambda usa Node 20, limita a concorrencia a 5 e recebe so a tabela e a chave por ambiente', () => {
    const funcao = unico('AWS::Lambda::Function');
    expect(funcao.Properties).toMatchObject({
      Runtime: 'nodejs20.x',
      Handler: 'index.handler',
      ReservedConcurrentExecutions: 5,
    });
    expect(Object.keys(funcao.Properties?.Environment.Variables).sort()).toEqual(['CHAVE_RESULTADOS', 'TABELA']);
  });

  it('o codigo embutido e so um marcador: o codigo de verdade sobe pelo script de implantacao', () => {
    const funcao = unico('AWS::Lambda::Function');
    expect(typeof funcao.Properties?.Code.ZipFile).toBe('string');
    expect(funcao.Properties?.Code.ZipFile.length).toBeLessThan(500);
  });

  it('a permissao da Lambda e minima: so UpdateItem, PutItem e Scan, so na tabela', () => {
    const papel = unico('AWS::IAM::Role');
    const politicas = papel.Properties?.Policies as { PolicyDocument: { Statement: any[] } }[];
    const declaracoes = politicas.flatMap((p) => p.PolicyDocument.Statement);
    expect(declaracoes).toHaveLength(1);
    expect([...declaracoes[0].Action].sort()).toEqual(['dynamodb:PutItem', 'dynamodb:Scan', 'dynamodb:UpdateItem']);
    expect(declaracoes[0].Effect).toBe('Allow');
    expect(declaracoes[0].Resource).toEqual({ 'Fn::GetAtt': [expect.any(String), 'Arn'] });
    expect(JSON.stringify(declaracoes)).not.toContain('"*"');
  });

  it('a Function URL pode ser chamada por qualquer pessoa, e so por ela', () => {
    const permissoes = doTipo('AWS::Lambda::Permission').map(([, r]) => r.Properties);
    expect(permissoes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Action: 'lambda:InvokeFunctionUrl', Principal: '*', FunctionUrlAuthType: 'NONE' }),
        expect.objectContaining({ Action: 'lambda:InvokeFunction', Principal: '*', InvokedViaFunctionUrl: true }),
      ]),
    );
    expect(permissoes).toHaveLength(2);
  });

  it('a senha do painel e parametro NoEcho e nao tem valor padrao', () => {
    const parametro = template.Parameters.ChaveResultados;
    expect(parametro.NoEcho).toBe(true);
    expect(parametro).not.toHaveProperty('Default');
    expect(parametro.MinLength).toBeGreaterThanOrEqual(8);
    expect(Object.keys(template.Parameters)).toEqual(['ChaveResultados']);
  });

  it('devolve o endereco da Function URL, o nome da tabela e o da funcao', () => {
    expect(Object.keys(template.Outputs).sort()).toEqual(['FunctionUrl', 'NomeDaFuncao', 'NomeDaTabela']);
  });
});
