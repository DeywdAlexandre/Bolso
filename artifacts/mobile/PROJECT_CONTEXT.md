# 🧠 Prisma: Contexto e Regras de Ouro

Este documento serve como a "memória central" do projeto Prisma. Deve ser lido no início de cada sessão para garantir que o desenvolvimento siga a visão do produto e as regras técnicas já estabelecidas.

---

## 💎 1. Visão do Produto
O **Prisma** não é apenas um gerenciador financeiro; é uma experiência premium de banco digital. Inspirado na estética do **Mercado Pago**, ele foca em fluidez, cores vibrantes e proatividade.

### Persona: Finn (IA)
O assistente Finn deve ser:
- Proativo e independente.
- Rápido e eficiente (estilo Replit).
- Capaz de antecipar erros de preenchimento do usuário.

---

## 📏 2. Regras de Ouro Técnicas (MANDATÓRIO)

### 🕰️ Lógica de Datas e Períodos
- **Fuso Horário**: Jamais use `new Date()` para filtrar meses ou anos diretamente. O JavaScript causa deslocamentos de fuso horário.
- **Regra**: Sempre use `split("-")` na string da data (`YYYY-MM-DD`) para extrair ano e mês de forma "timezone-agnostic".

### 💰 Lógica de Saldos no Dashboard
- **Saldo Principal**: Exibe o **Saldo Global Acumulado** (todo o histórico).
- **Desempenho Mensal**: Exibido de forma discreta abaixo do saldo, focando apenas no período selecionado.

### 🎨 Design System (Estilo Mercado Pago)
- **Cabeçalhos**: Uso de `headerBackground` colorido (cor `primary`) no topo das telas principais.
- **Efeito de Profundidade**: Cards de resumo devem ter margem negativa ou sobreposição para "flutuar" sobre o cabeçalho colorido.
- **Feedback Visual**: Botões devem ter opacidade reduzida ou avisos (`Alert`) claros quando campos obrigatórios estiverem vazios.

---

## 🛠️ 3. Arquitetura Core
- **Navegação**: `expo-router` com cabeçalhos padronizados.
- **Estado**: `AppDataContext` centraliza toda a persistência via `AsyncStorage`.
- **Offline-First**: O app deve funcionar 100% sem internet, usando persistência local robusta.

---

## 📊 4. Módulos Específicos

### Empréstimos (Loans)
- **Validação**: Impedir salvamento sem Descrição, Valor ou Juros (0% de juros é permitido).
- **Lógica de Pagamento**: Primeiro abate os juros do mês, o restante abate o saldo principal.

### Veículos (Vehicles)
- **Foco**: Consumo médio (KM/L), custo por KM e controle rigoroso de troca de óleo.

---

## 💾 5. Estratégia de Backup
- **Versionamento**: Todo backup deve conter uma tag `version` para permitir migrações automáticas de dados quando o app ganhar novos módulos.
- **Destinos**: Exportação manual para JSON (WhatsApp/E-mail) e futura integração automática com Google Drive.

---

## 🚀 6. Execução Local
Para rodar o ambiente de desenvolvimento web no terminal:
```powershell
cd artifacts/mobile
pnpm exec expo start --web
```

---
*Documento atualizado em 01/05/2026 para incluir diretrizes de execução.*
