// Script para corrigir Festivals.tsx removendo as funções duplicadas
// Execute: node scripts/fix_festivals.cjs
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/admin/Festivals.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log(`Total de linhas: ${lines.length}`);

// Encontrar a linha que fecha o componente principal (export default Festivals)
// Após a linha que contém '</AdminLayout>' seguida de ');' e '}'
// E ANTES de qualquer código solto ou duplicado

// Estratégia: pegar as linhas até a primeira ocorrência de linha vazia após '}'
// no fim do componente principal.

// Sabemos que a linha 3096 (índice 3095) fecha o componente principal com '}'
// Tudo depois disso na versão original eram duplicatas
// No arquivo atual CORROMPIDO, a partir da linha 3097 (índice 3096) temos corpo solto

// Vamos encontrar a última '}' sozinha numa linha que fecha o componente principal
// procurando o padrão: linha com '</AdminLayout>' e depois ');\n}\n'

let cutLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '</AdminLayout>') {
    // Verificar as próximas 2-3 linhas para encontrar ); e }
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      if (lines[j].trim() === ');') {
        for (let k = j + 1; k < Math.min(j + 3, lines.length); k++) {
          if (lines[k].trim() === '}') {
            cutLine = k + 1; // Linha logo após o '}'
            console.log(`Encontrado fechamento do componente principal na linha ${k + 1} (1-indexado)`);
            break;
          }
        }
        if (cutLine !== -1) break;
      }
    }
    if (cutLine !== -1) break;
  }
}

if (cutLine === -1) {
  console.error('Não foi possível encontrar o ponto de corte automaticamente.');
  console.log('Tentando corte manual na linha 3096...');
  cutLine = 3096; // fallback
}

// Pegar apenas as linhas 0 até cutLine (exclusive)
// As funções sub-componentes ORIGINAIS estão ANTES do componente principal (linhas 1-104 aprox)
// Então precisamos apenas cortar as DUPLICATAS que estão DEPOIS do fechamento

const truncated = lines.slice(0, cutLine).join('\n');
fs.writeFileSync(filePath, truncated, 'utf8');

const newLines = truncated.split('\n').length;
console.log(`✅ Arquivo corrigido! De ${lines.length} para ${newLines} linhas.`);
console.log(`Duplicatas removidas. Pronto para build.`);
