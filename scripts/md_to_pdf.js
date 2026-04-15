import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function generate() {
  try {
    const mdPath = path.resolve('Manual_do_Usuario_Kineos.md');
    if (!fs.existsSync(mdPath)) {
      console.error('Arquivo markdown não encontrado:', mdPath);
      return;
    }
    
    const mdContent = fs.readFileSync(mdPath, 'utf8');
    
    // HTML Wrapper com marked.js e github-markdown-css
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Manual Kineos</title>
        <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown.min.css">
        <style>
          body { 
            background-color: white !important;
          }
          .markdown-body { 
            box-sizing: border-box; 
            min-width: 200px; 
            max-width: 980px; 
            margin: 0 auto; 
            padding: 45px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
          }
          pre { background-color: #f6f8fa !important; }
          code { background-color: #f6f8fa !important; }
          @media print {
            .markdown-body { padding: 0; }
          }
        </style>
      </head>
      <body class="markdown-body">
        <div id="content"></div>
        <script>
          // Limpar o conteúdo para evitar problemas com crases no template string
          const rawMd = \`${mdContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
          document.getElementById('content').innerHTML = marked.parse(rawMd);
        </script>
      </body>
      </html>
    `;

    console.log('Iniciando navegador Playwright...');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    console.log('Renderizando HTML...');
    await page.setContent(htmlContent);
    
    // Pequena espera para garantir que o script CDN do marked.js carregou e processou
    await page.waitForFunction(() => document.getElementById('content').innerHTML !== '');
    
    console.log('Gerando PDF...');
    await page.pdf({ 
      path: 'Manual_do_Usuario_Kineos.pdf', 
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      printBackground: true
    });
    
    await browser.close();
    console.log('SUCESSO: Manual_do_Usuario_Kineos.pdf gerado na raiz do projeto.');
  } catch (error) {
    console.error('ERRO ao gerar PDF:', error);
  }
}

generate();
