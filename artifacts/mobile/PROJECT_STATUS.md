# 📱 Projeto Prisma - Status & Roadmap

O **Prisma** é um assistente financeiro pessoal "Offline-First" com inteligência artificial integrada, focado em simplicidade, privacidade e controle total de gastos, veículos e empréstimos.

---

## 🏗️ Arquitetura e Tech Stack
- **Framework**: React Native com Expo (SDK 54).
- **Navegação**: Expo Router (File-based routing).
- **Persistência**: AsyncStorage & SecureStore.
- **IA**: Integrado com OpenRouter (Assistente Finn).
- **Estilo**: Premium Minimalista (Mercado Pago Style / Dark Mode).
- **Deploy**: Expo Updates (OTA Workflow) - Branch `preview` ativa.

---

## ✅ Módulos Implementados

### 1. Dashboard Inteligente (Evoluído 💎)
- **Separação de Patrimônio**: Saldo Líquido separado do Patrimônio Guardado.
- **Widget de Acúmulo**: Visualização clara do total investido em metas.
- **Atalhos Otimizados**: Foco em Gasto, Ganho e Fixos para maior agilidade.
- **Privacidade**: Ocultação de valores e metas individuais na tela inicial.

### 2. Metas & Futuro (Destaque 🚀)
- **Simulador CDI/Poupança**: Projeções com juros compostos.
- **Rendimento Automático**: O app gera depósitos de juros mensalmente de forma autônoma.
- **Detalhamento de Jornada**: Distinção entre "Meus Aportes" e "Rendimentos do Banco".

### 3. Gestão de Assinaturas & Fixos
- Suporte a recorrências com projeção de custo anual.

### 4. Veículos & Empréstimos (Completo 🏛️)
- **CRM Financeiro**: Gestão de contatos, dívidas e parcelas fixas/variáveis.
- **Agenda Situacional**: Centro de comando para vencimentos (Atrasados, Hoje, 7 dias).
- **Extratos PDF**: Geração de relatórios profissionais compartilháveis via WhatsApp.

### 5. Segurança & Backup (Infra Nativa 🔐)
- **Proteção Biométrica**: Bloqueio total do app com Digital/Face ID (Pronto para APK).
- **Backup Profissional**: Exportação e Importação real de arquivos .json com versionamento.
- **Notificações**: Lembretes automáticos de vencimento agendados localmente.

---

## 📈 Log de Atualizações (06/05/2026)

- **v1.5.1 (Estabilização)**: Adicionados plugins nativos no `app.json` (Biometria, Notificações, Câmera, etc).
- **Infra**: Funções nativas (AuthGuard e Notifications) temporariamente desativadas via JS para garantir estabilidade no primeiro build.
- **IA**: Upgrade no Finn - Agora gerencia metas, confirma veículos e gera relatórios PDF sob demanda.
- **Ajuste**: Simplificação dos modelos sugeridos para GPT-4o mini (padrão) e DeepSeek V3.

---

## ⏳ Próximos Passos (Backlog)

### 🚀 Prioridade Máxima
- [ ] **Validação de APK**: Instalar o novo build estável e confirmar que abre sem crashes.
- [ ] **Ativação Gradual (OTA)**: 
    1. Reativar Biometria e testar.
    2. Reativar Notificações e testar.

### 📡 Futuras Evoluções (Infra Pronta)
- [ ] **Contatos**: Vincular empréstimos diretamente à agenda do celular.
- [ ] **Calendário**: Sincronizar vencimentos com o Google/iCloud Calendar.
- [ ] **Scanner**: Anexar fotos de recibos via câmera.
- [ ] **Gamificação**: Medalhas por metas alcançadas.

---
*Atualizado por Antigravity em 06/05/2026 - Versão Premium 1.5.1 (Stabilization)*
