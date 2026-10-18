# 🧠 Guia do Agente: Projeto Prisma

Este arquivo serve como o manual definitivo de desenvolvimento, arquitetura e diretrizes de design do **Prisma** (controle financeiro pessoal). Todos os agentes de IA que trabalharem neste projeto devem seguir rigorosamente as regras aqui estabelecidas para garantir a consistência, qualidade e integridade do código.

---

## 💎 1. Visão Geral do Produto & Design System
O **Prisma** é uma ferramenta de controle financeiro pessoal offline-first que proporciona uma experiência visual premium de banco digital, inspirada na estética do **Mercado Pago** e **Robinhood**.

### Diretrizes de UI/UX (Premium Standards)
*   **Tema Escuro (Dark Mode Premium)**: A paleta de cores padrão utiliza tons escuros elegantes (conforme definido em [colors.ts](artifacts/mobile/constants/colors.ts)) com destaque na cor **verde esmeralda** (`primary`) para representar saldo positivo, ganhos e botões de ação principal.
*   **Efeito de Profundidade**: Elementos flutuantes, como cards de resumo financeiro, devem usar sobreposição física (margem negativa ou posicionamento relativo) sobre cabeçalhos com fundo colorido (`headerBackground`), criando uma sensação tridimensional.
*   **Micro-interações e Feedback**: Todos os botões interativos devem ter opacidade reduzida (`activeOpacity={0.7}`) ou feedbacks táteis apropriados. Botões de submissão de formulário devem ficar desabilitados ou alertar claramente o usuário caso campos obrigatórios não estejam preenchidos.
*   **Não utilize Placeholders**: Imagens, ícones e fluxos devem ser totalmente funcionais ou devidamente mockados com assets locais elegantes.

### Persona: Finn (IA)
O assistente de IA integrado ao app chama-se **Finn**. Ele atua como um assessor proativo que:
1.  Antecipa possíveis erros de digitação ou preenchimento do usuário.
2.  É rápido, direto e eficiente.
3.  Usa tom de voz amigável, prestativo e profissional em português brasileiro.

---

## 📐 2. Diretrizes de Desenvolvimento (Regras de Ouro Técnicas)

### 🕰️ Lógica de Datas e Período (Crítico)
> [!WARNING]
> **Jamais use `new Date()` para filtrar meses ou anos diretamente.** O JavaScript introduz deslocamentos de fuso horário dependendo de onde o código está rodando (especialmente em ambientes móveis), o que pode fazer transações de início ou fim de mês sumirem ou mudarem de período.
> 
> **Regra Obrigatória**: Sempre use strings de data no formato ISO (`YYYY-MM-DD`) e separe-as usando `split("-")` para extrair o ano e o mês de forma puramente matemática e imune a timezones.
> Exemplo:
> ```typescript
> const [year, month] = dateStr.split("-").map(Number);
> ```

### 💰 Lógica de Saldos no Dashboard
*   **Saldo Principal**: Deve exibir o **Saldo Global Acumulado** (todo o histórico de transações de ganhos e gastos acumulados até o momento).
*   **Desempenho Mensal**: O resultado específico do mês/período selecionado (Ganhos - Gastos do mês) deve ser exibido de forma secundária e discreta abaixo do saldo global, permitindo ao usuário analisar o período sem perder a visão do patrimônio líquido total.

### 🏛️ Lógica de Amortização de Empréstimos (Loans)
*   Ao registrar pagamentos em empréstimos de juros mensais simples, o valor pago deve primeiro abater os **juros acumulados do mês**. O montante sobressalente do pagamento, se houver, será usado para amortizar o **saldo devedor principal**.
*   Impedir a gravação de empréstimos que não possuam: Descrição, Valor Principal ou Juros (taxa de 0% é aceita para empréstimos a familiares/amigos).

### 🚗 Módulo de Veículos (Combustível & Manutenção)
*   **Cálculo Inteligente de Abastecimento**: O formulário possui 3 campos (Valor Total, Litros e Preço por Litro). O preenchimento de quaisquer 2 campos deve calcular e preencher o 3º automaticamente.
*   **KM/L Médio**: Calculado por meio de segmentos "cheio para cheio" ou "reserva para reserva". Abastecimentos parciais não fecham segmentos de consumo médio.
*   **Troca de Óleo**: Alerta ativo baseado no odômetro atual versus o odômetro da última troca somado ao intervalo selecionado (atalhos: 3k, 5k, 7.5k ou 10k km).
*   **Vínculo com Extrato**: Transações de abastecimento ou manutenção de veículos devem poder gerar, atualizar ou excluir automaticamente uma transação correspondente na categoria "Transporte" do extrato financeiro principal (via toggle de sincronização).

### 📅 Módulo de Plantões (Shifts)
*   Gerencia escalas de serviço (ordinárias e extras).
*   Suporta regras de recorrência: rotativa (ex: 12x36h), semanal fixa (dias da semana específicos) e datas fixas.
*   Permite a criação automática de transações no extrato principal correspondentes à remuneração de plantões extras e integração opcional com o Google Calendar.

---

## 🛠️ 3. Arquitetura e Organização de Pastas
O projeto segue uma estrutura de workspace do pnpm. O código do aplicativo móvel está contido inteiramente em [artifacts/mobile](artifacts/mobile).

### Estrutura de Pastas de `artifacts/mobile/`
*   [`app/`](artifacts/mobile/app/): Roteamento baseado em arquivos via `expo-router`.
    *   `(tabs)/`: Abas principais do app: Dashboard (`index`), Veículos (`vehicles`), Metas (`goals`), Empréstimos (`loans`) e Plantões (`shifts`).
    *   `_layout.tsx`: Layout root do app, injeta os provedores globais de contexto e exibe o chat do Finn por cima das telas.
*   [`components/`](artifacts/mobile/components/): Componentes de interface do usuário limpos e atômicos (evite colocar lógica complexa de estado aqui).
*   [`contexts/`](artifacts/mobile/contexts/): Provedores de estado e persistência:
    *   [`AppDataContext.tsx`](artifacts/mobile/contexts/AppDataContext.tsx): Centraliza e une todos os estados do aplicativo. É o ponto de entrada único para persistência.
    *   [`SettingsContext.tsx`](artifacts/mobile/contexts/SettingsContext.tsx): Gerencia as configurações globais (moeda, chave OpenRouter, modelo de IA ativo).
    *   [`ChatContext.tsx`](artifacts/mobile/contexts/ChatContext.tsx): Controla o histórico de chat e gerencia a lógica de execução de tool calls.
*   [`hooks/state/`](artifacts/mobile/hooks/state/): **Organização de Estado Modular (Evite Arquivos Deus)**.
    > [!IMPORTANT]
    > A lógica de manipulação e persistência (carregamento/salvamento) dos estados de dados é dividida em hooks customizados por domínio em `hooks/state/` (ex: `useTransactionsState`, `useVehiclesState`, `useLoansState`, `useGoalsState`, `useShiftsState`). 
    > O `AppDataContext` apenas unifica e injeta as dependências cruzadas entre esses hooks. Sempre que criar um novo domínio, adicione um hook customizado nesta pasta e evite inchar o `AppDataContext.tsx`.
*   [`lib/`](artifacts/mobile/lib/): Utilitários puros, funções matemáticas, formatação de moeda e integração com serviços:
    *   [`vehicleStats.ts`](artifacts/mobile/lib/vehicleStats.ts): Lógica de cálculo de KM/L e troca de óleo.
    *   [`openrouter.ts`](artifacts/mobile/lib/openrouter.ts): Cliente leve para requisição de chat completions.
    *   [`secureStorage.ts`](artifacts/mobile/lib/secureStorage.ts): Armazenamento criptografado nativo para chaves de API sensíveis.

---

## 🤖 4. Arquitetura da IA (Finn)
O Finn funciona utilizando a API do OpenRouter e possui suporte a chamadas de função (Tool Calling) complexas e recursivas.

### Modularidade do Sistema de IA (`artifacts/mobile/lib/ai/`)
Para evitar sobrecarga de arquivo, a inteligência do Finn é estritamente modular:
*   [`systemPrompt.ts`](artifacts/mobile/lib/ai/systemPrompt.ts): Define o comportamento, personalidade e regras de restrição do Finn.
*   [`toolDefinitions.ts`](artifacts/mobile/lib/ai/toolDefinitions.ts): Contém os schemas JSON das ferramentas expostas à IA.
*   [`toolTypes.ts`](artifacts/mobile/lib/ai/toolTypes.ts): Contém as definições de tipos TypeScript dos argumentos de cada ferramenta.
*   [`handlers/`](artifacts/mobile/lib/ai/handlers/): Pasta contendo arquivos isolados por domínio para tratar as execuções de ferramentas (ex: `transaction.ts`, `vehicle.ts`, `loan.ts`, `goal.ts`, `shift.ts`, `briefing.ts`).

### Mecanismo de Execução de Tools (ChatContext)
*   **Multi-Round Execution**: O `ChatContext` monitora as chamadas de ferramentas e suporta até **4 rodadas consecutivas** de requisição em uma única interação. Isso permite que a IA faça perguntas ao banco de dados local, calcule tendências e insira dados sequencialmente antes de dar a resposta final ao usuário.
*   **Tratamento de Erros**: Se alguma chamada de ferramenta falhar, a falha é capturada e injetada no chat como resposta de ferramenta para que o modelo possa se autocorrigir ou relatar o erro de forma amigável ao usuário.

---

## 🛡️ 5. Boas Práticas do Desenvolvedor AI (Seja Proativo)
Como assistente no projeto Prisma, você deve seguir estas regras mentais de qualidade:
1.  **Varreduras de Inconsistência**: Antes de dar uma tarefa por encerrada, inspecione os arquivos relacionados para garantir que tipos não foram corrompidos e que não há imports órfãos.
2.  **Organização sobre Conveniência**: Nunca junte código não relacionado num mesmo arquivo. Crie hooks, components e handlers modulares.
3.  **Timezone Safe**: Sempre certifique-se de que filtros temporais de transações utilizam a regra do `split("-")`.
4.  **Preservação de Documentação**: Não remova comentários e JSDocs existentes ao modificar arquivos, a menos que tenham se tornado obsoletos.
