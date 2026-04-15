# Kineos Studio OS: Manual Completo de Utilização v2.5

Bem-vindo ao **Kineos**, o sistema operacional definitivo para estúdios de dança e artes. Este manual detalha todos os módulos, fluxos e "inteligências" integradas para garantir 100% de integridade financeira e excelência operacional.

---

## 1. Visão Geral e Arquitetura
O Kineos é uma plataforma **multi-tenant** (cada estúdio possui seu ambiente isolado) integrada ao **Supabase** (Banco de dados e Real-time), **Mercado Pago** (Pagamentos) e **Evolution API** (WhatsApp).

### Acesso e Permissões
- **SuperAdmin**: Gestão global da plataforma e novos estúdios.
- **Admin**: Controle total do estúdio (Financeiro, CRM, Grade).
- **Instrutor**: Gestão de turmas, chamadas e evolução técnica dos alunos.
- **Aluno**: Auto-atendimento, agendamentos e histórico financeiro.

---

## 2. Gestão de Alunos e CRM
O coração da operação está no módulo de alunos, projetado para converter leads em matrículas ativas.

### Fluxo de Onboarding
1. **Aulas Experimentais**: O aluno se cadastra via página pública. O sistema gera um Lead no painel `Experimentos`.
2. **Wizard de Matrícula**: Ao matricular, o admin preenche:
    - **Dados Pessoais**: CPF (obrigatório para contratos), telefone, data de nascimento.
    - **Financeiro**: Seleção do **Dia de Vencimento Unificado** (ex: todo dia 10).
    - **Responsável Financeiro**: Obrigatório para menores de idade.
3. **Contrato Inteligente**: O sistema gera um PDF dinâmico preenchendo automaticamente `[nome_aluno]`, `[valor_total]`, `[modalidades]` e `[cláusulas_específicas]`.
4. **Checkout Inicial**: O sistema envia um link de pagamento via WhatsApp para a primeira mensalidade e matrícula.

---

## 3. Grade de Horários (The Cockpit)
O **Cockpit** é o centro de controle diário do estúdio.

- **Visualização Reativa**: Turmas coloridas por modalidade com status de ocupação (Verde: Livre, Amarelo: >70%, Vermelho: Check-in total).
- **Lista de Espera Inteligente**: Quando uma vaga surge, o sistema notifica o primeiro da fila automaticamente via WhatsApp.
- **Bloqueios de Agenda**: Permite pausar horários para feriados ou manutenção, impedindo agendamentos indevidos.

---

## 4. Inteligência Financeira e Faturamento Consolidado
Implementamos o **Consolidated Billing Engine v2** para máxima transparência.

### Como funciona o Faturamento Consolidado:
Se um aluno faz **Ballet (R$ 200)** e **Jazz (R$ 150)**:
- **Agora (Kineos v2)**: O sistema unifica tudo em uma única fatura de **R$ 350**, facilitando o pagamento via Pix ou Cartão pelo aluno.

### Regras de Ouro do Financeiro:
- **Trava de Fim de Contrato**: O sistema para de gerar mensalidades automaticamente ao atingir a `data_fim` definida na matrícula.
- **Bloqueio Inadimplente**: Se houver faturas atrasadas, o sistema bloqueia o acesso do aluno ao portal.

---

## 5. Portal do Instrutor (Educação)
Foco na evolução técnica e controle de presença.

- **Chamada Digital**: Realizada em segundos via smartphone.
- **Fichas de Evolução**: Registro de fotos e vídeos sobre o desempenho de cada aluno.

---

## 6. Módulos Operacionais de Apoio

### Figurinos (Estoque e Aluguel)
- Cadastro de modelos com variações de tamanho (P, M, G, 12, etc).
- **Alertas de Atraso**: Painel vermelho para figurinos que não retornaram na data prevista.

### Festivals (Eventos e Ingressos)
- Gestão de custos e orçamentação de espetáculos.
- **Check-in via QR Code**: Ingressos digitais que podem ser validados na porta do teatro.

---

## 7. Integrações e Automações
- **WhatsApp (Evolution API)**: Lembretes de pagamento e boas-vindas.
- **Mercado Pago**: Conciliação bancária automática.

---

*Manual atualizado em 11 de Abril de 2026.*
