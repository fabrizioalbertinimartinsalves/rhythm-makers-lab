# Kineos Studio OS: Documentação Técnica v1.0

Este documento detalha o backend e frontend do sistema Kineos para desenvolvedores.

---

## 1. Arquitetura
- **Database**: PostgreSQL (Supabase)
- **Frontend**: React + Vite + TypeScript
- **Auth**: Supabase Auth (JWT)
- **Storage**: Supabase Storage (Bucket: `festival-media`, `costumes`, `avatars`)

---

## 2. Core RPCs (Logic)
Todas as operações críticas são atômicas via funções SQL:
- `process_student_enrollment`: Gerencia matrícula, contrato e fatura.
- `generate_recurring_invoices`: Motor de faturamento mensal.
- `process_student_unenrollment`: Inativação e cálculo de multa.

---

## 3. Integrations Config
As chaves de API são armazenadas na tabela `integrations` com criptografia e isolamento por estúdio.

- **Evolution API**: Configuração de WhatsApp.
- **Mercado Pago**: Access Tokens para checkout.

---

*Para detalhes de schema, consulte as migrations em `/supabase/migrations/`.*
