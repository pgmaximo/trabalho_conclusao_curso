import { defineBackend } from '@aws-amplify/backend';
// Adicione o .ts no final para testar a resolução direta
import { auth } from './auth/resource.ts'; 
import { data } from './data/resource.ts'; 

defineBackend({
  auth,
  data,
});