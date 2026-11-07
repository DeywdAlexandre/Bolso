# 🗺️ Roadmap de Planos Futuros: Projeto Prisma

Este documento registra todas as ideias, melhorias arquiteturais e funcionalidades mapeadas para expansão do **Prisma**. Qualquer agente ou desenvolvedor que retomar o projeto deve consultar este arquivo para dar continuidade aos planos acordados.

---

## 📌 1. Módulo de Plantões & Rotina Profissional (Prioridade Alta)

### 🔄 Troca e Permuta de Plantões
*   **Problema**: Plantonistas frequentemente trocam dias com colegas e perdem o controle de quem deve plantão para quem.
*   **Solução**:
    *   Cadastrar permutas vinculadas ao contato do colega: *"Passei o plantão do dia 12/12 para o Dr. Fulano (ele me deve 1 plantão de 12h)"*.
    *   Painel visual: **"Plantões a pagar"** vs **"Plantões a receber"**.
    *   Quitação da permuta quando a troca for devolvida.

### ⏳ Rastreio de Plantões Atrasados / A Receber (Cooperativas & Hospitais)
*   **Problema**: Plantões extras demoram 30 a 90 dias para serem pagos e frequentemente sofrem atrasos ou glosas.
*   **Solução**:
    *   Lista de plantões realizados mas ainda **não pagos**.
    *   Filtro por local de trabalho / hospital / prefeitura.
    *   Total acumulado que cada pagador está devendo.
    *   Notificação ou aviso no briefing matinal quando o pagamento estiver com prazo estourado.

---

## 📈 2. Previsibilidade Financeira & Fluxo de Caixa Futuro

### 🔮 Saldo Futuro Projetado (30, 60 e 90 Dias)
*   **Dados já existentes no banco local**:
    *   Faturas futuras de cartão já parceladas (`summary.futureTotal`).
    *   Gastos fixos e assinaturas mensais recorrentes (`recurring`).
    *   Plantões extras com valor estimado a receber (`shifts`).
    *   Parcelas de empréstimos a receber ou pagar (`loans`).
*   **Funcionalidade**:
    *   Gráfico de linha ou régua de saldo prevendo o dinheiro em conta nos próximos meses: *"Saldo atual: R$ 3.000 → Saldo previsto em 30 dias: R$ 1.250"*.

---

## 🎯 3. Orçamentos & Tetos Mensais (Budgeting)

### 📊 Limite de Gastos por Categoria
*   **Funcionalidade**:
    *   Definir metas/tetos mensais de despesa por categoria (ex.: Alimentação: R$ 1.000 / Lazer: R$ 400).
    *   Barra de progresso visual (Verde → Amarelo → Vermelho).
    *   Gatilho do Finn: alertar proativamente no briefing matinal quando atingir 80% do limite estabelecido.

---

## 📄 4. Contracheque, Holerite & Descontos em Folha

### 💼 Gestão de Salário Real & Consignados
*   **Funcionalidade**:
    *   Registro de salário bruto vs líquido.
    *   Controle de empréstimos consignados e pagamentos debitados em folha (*Pag Deb Folha*).
    *   Separação clara entre o que cai líquido na conta e os descontos na fonte (previdência, imposto de renda, planos).

---

## 📥 5. Facilidade de Entrada de Dados & Conciliação

### 🏦 Importação de Extratos Bancários (.OFX / CSV)
*   **Funcionalidade**:
    *   Permitir importar arquivos `.OFX` (padrão de extrato de todos os bancos brasileiros: Nubank, Inter, Itaú, BB).
    *   Conciliação automática: identificar o que já foi lançado e sugerir criar apenas transações novas com 1 toque.

### 🏷️ Tags de Projetos Especiais (Ex.: `#viagem`, `#reforma`)
*   **Funcionalidade**:
    *   Adicionar campo de tags na transação para consolidar custos que cruzam várias categorias em um único evento.

---

## 🛠️ 6. Melhorias Técnicas Contínuas

*   [ ] **Segurança de Timezone**: Padronizar as funções auxiliares em `history.tsx` e `format.ts` para usar a regra do `split("-")` sem exceções.
*   [ ] **Typecheck Monorepo**: Ajustar tipagens do pacote acessório `mockup-sandbox` para zerar o `tsc` na raiz do monorepo.
