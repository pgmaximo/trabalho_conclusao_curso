#!/bin/bash
# Exporta o ambiente do Lambda do chat (sem imprimir) e roda o roteiro local.
F=$(aws lambda list-functions --query "Functions[?contains(FunctionName,'pedro-sandbox-chatassistant')].FunctionName" --output text)
eval "$(aws lambda get-function-configuration --function-name "$F" --query Environment.Variables --output json | node -e "const e=JSON.parse(require('fs').readFileSync(0,'utf8'));for(const[k,v]of Object.entries(e))if(!/USPSTF|AMPLIFY_SSM/.test(k))console.log('export '+k+'='+JSON.stringify(v))")"
export USPSTF_API_KEY=$(MSYS_NO_PATHCONV=1 aws ssm get-parameter --name /amplify/tcc/pedro-sandbox-12a5bc5141/USPSTF_API_KEY --with-decryption --query Parameter.Value --output text)
export AWS_USE_FIPS_ENDPOINT=true MODO=local AWS_REGION=us-east-1 SCRATCH="$1"
shift
npx tsx specs/10-finalizacao-codigo/01-melhorias-ia/conferencia-sandbox/roteiro/roteiro.mts "$@"
