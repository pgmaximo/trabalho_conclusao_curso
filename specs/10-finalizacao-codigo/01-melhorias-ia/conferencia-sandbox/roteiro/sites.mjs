import { CREDS, login, gql } from './lib.mjs';
const tk = await login(CREDS.A.email, CREDS.A.password);
for (const c of process.argv.slice(2)) {
  try {
    const d = await gql(tk, `query($c:String!){ getVaccinationSites(codigoMunicipio:$c){ unidades{ nome bairro } } }`, { c });
    const u = d.getVaccinationSites?.unidades ?? [];
    console.log(c, u.length, [...new Set(u.map((x) => x.bairro))].slice(0, 12).join(' | '));
  } catch (e) { console.log(c, 'ERRO', String(e).slice(0, 300)); }
}
