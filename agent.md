# 🤖 Guia do Agente: Projeto Prisma

> **Manual de Consulta Rápida (TL;DR)**  
> Leia este arquivo antes de alterar qualquer código no repositório. Ele resume as regras inegociáveis, padrões de arquitetura e comandos essenciais para você ser rápido e produtivo sem precisar varrer centenas de arquivos.

---

## ⚡ 1. Resumo em 60 Segundos

*   **O que é**: App mobile offline-first para controle financeiro, faturas de cartão de crédito, veículos, empréstimos e plantões.
*   **Stack**: React Native (Expo SDK 54), `expo-router` v6, TypeScript 5.9, Vitest, Node 24.
*   **Onde fica o código**: Todo o app mobile está contido em [`artifacts/mobile/`](artifacts/mobile/).
*   **Persistência**: 100% local no cliente via `AsyncStorage` (chaves `@prisma/*/v1`) e `expo-secure-store` para a chave OpenRouter. **Não há backend nem banco na nuvem**.
*   **Mapa completo**: Consulte [`MAPA.md`](MAPA.md) para ver a árvore completa de telas, rotas e chaves de armazenamento.

---

## 🛡️ 2. Regras de Ouro Técnicas (Inegociáveis)

### 🕰️ 1. Tratamento de Datas & Fuso Horário
> [!WARNING]
> **NUNCA use `new Date(dateStr).getMonth()` ou `.getFullYear()` para filtrar transações.**  
> O fuso horário do Brasil (UTC-3) faz com que datas ISO sem horário (ex.: `"2026-05-01"`) sejam convertidas para `2026-04-30 21:00:00`, fazendo transações do início do mês sumirem ou trocarem de período.

*   **Padrão Obrigatório**: Trate strings de data puramente com matemática e strings:
    ```typescript
    const [year, month, day] = dateStr.slice(0, 10).split("-").map(Number);
    // year: 2026, month: 5 (1-12)
    ```

### 💳 2. Cartões de Crédito & Faturas
*   **Dívida Consolidada (`summary.debt`)**: Soma **todas** as compras e parcelas futuras cadastradas menos os pagamentos já feitos. Representa o comprometimento total do cartão.
*   **Fatura do Mês (`summary.current`)**: Fatura que fecha no mês corrente (ex.: que fecha em dezembro). É o **valor principal exibido em destaque** para o usuário na tela inicial e no cabeçalho do cartão.
*   **Pagar Fatura**: É sempre uma **transferência** de uma conta corrente para a conta do cartão (`Transfer`, não vira despesa no extrato).
*   **Importação por IA**: `lib/invoiceImport.ts` concilia com compras já cadastradas para nunca duplicar e permite desfazer importações via `undoCardImport`.

### 📦 3. Evite "Arquivos Deus" (Modularidade)
*   **Estado**: Não sobrecarregue `AppDataContext.tsx`. A lógica de estado vive isolada em [`artifacts/mobile/hooks/state/`](artifacts/mobile/hooks/state/) (ex.: `useTransactionsState`, `useAccountsState`, `useVehiclesState`).
*   **IA (Finn)**: Cada ferramenta do Finn tem seu executor em um arquivo próprio em [`artifacts/mobile/lib/ai/handlers/`](artifacts/mobile/lib/ai/handlers/).

### 🚗 4. Regras do Módulo de Veículos
*   **Abastecimento inteligente**: Preencher 2 campos (Valor Total, Litros, Preço/L) calcula o 3º automaticamente.
*   **Consumo (KM/L)**: Calculado estritamente por trechos completos: *Cheio→Cheio* ou *Reserva→Reserva* (`lib/fuelSegments.ts`). Abastecimentos parciais nunca fecham médias.

---

## 🛠️ 3. Comandos Essenciais

Todos os comandos do aplicativo devem rodar com base em `artifacts/mobile` ou filtrando o workspace:

```bash
# 1. Executar os 250 testes unitários (Vitest)
npx pnpm --filter @workspace/mobile test

# 2. Verificar tipagem TypeScript (sem erros tolerados)
npx pnpm --filter @workspace/mobile run typecheck

# 3. Rodar o app localmente no navegador (Web)
cd artifacts/mobile && npx expo start --web

# 4. Publicar atualização instantânea no celular via OTA (Over-The-Air)
cd artifacts/mobile && EAS_NO_VCS=1 npx eas-cli@latest update --channel preview --message "descricao da mudanca"
```

---

## ✅ 4. Checklist do Agente Antes de Finalizar

1. [ ] **Testes passaram?** Rode `npx pnpm --filter @workspace/mobile test` (garanta 100% de sucesso).
2. [ ] **Sem erros de tipo?** Rode `npx pnpm --filter @workspace/mobile run typecheck`.
3. [ ] **Timezone seguro?** Verifique se não introduziu `new Date()` para filtros de mês/ano.
4. [ ] **Sem arquivos soltos?** Mantenha componentes novos em `components/`, regras em `lib/` e hooks em `hooks/state/`.
