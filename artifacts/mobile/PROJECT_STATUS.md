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

## 📈 Log de Atualizações

### Revisão geral (out/2026)
- **Nome**: padronizado em **Prisma**. Chaves de storage `@bolso/*` → `@prisma/*`, com migração automática na primeira abertura (dados existentes preservados; chaves antigas mantidas como rede de segurança). Backups antigos (`app: "Bolso"`) continuam importáveis.
- **Limpeza**: removida a integração com Google (`lib/google`, tela google-sync, campos de settings/tipos), componentes sem uso (`ChatFAB`, `SummaryCards`, `CategoryBreakdown`, `KeyboardAwareScrollViewCompat`) e `lib/test_stats.ts`.
- **Correção**: histórico do chat podia começar com mensagem de ferramenta órfã após o corte de 50 mensagens, causando erro na API; agora sempre inicia em uma mensagem do usuário.
- **Docs**: `replit.md`, `agente.md` e skills atualizados.

### Modelo de IA padrão (out/2026)
- Padrão do OpenRouter agora é **Claude Haiku 5.5** (`anthropic/claude-haiku-5.5`, em `lib/models.ts`). Quem estava no padrão antigo (GPT-4o mini) é migrado na primeira abertura; escolhas do usuário (ex.: DeepSeek) são preservadas.
- Erros do OpenRouter (modelo não encontrado, chave inválida, sem créditos, limite) agora aparecem em português no chat.

### Consumo (km/L) e instalação do PWA (out/2026)
- **km/L**: novo motor `lib/fuelSegments.ts`. Antes só usava Reserva se houvesse menos de 2 Cheios (e ignorava as Reservas com 2+ Cheios); agora Cheio→Cheio e Reserva→Reserva coexistem sem contar o mesmo trecho duas vezes. Parciais e abastecimentos do meio somam ao trecho. 18 testes cobrindo reserva, parcial, cheio, mistura, ordem e dados ruins.
- **Finn**: `get_vehicle_stats` devolve trechos medidos, melhor/pior trecho e trecho em andamento; o prompt ensina as regras de Cheio/Reserva/Parcial.
- **Tela do veículo**: nova seção "Trechos de consumo" com cada trecho medido e o trecho em andamento.
- **Instalar**: botão em Configurações e convite dispensável (14 dias) no Chrome/Android e iPhone/Safari.

### PWA: service worker e cache (out/2026)
- Não existia service worker (só manifest): o app não abria offline e dependia do cache HTTP. Criado `public/sw.js` (HTML rede-primeiro com fallback offline, assets com hash cache-primeiro) e `lib/pwa.ts`.
- Aviso "Nova versão disponível" (`UpdateBanner`) ao detectar deploy novo com o app aberto; remove cache de bundles antigos.
- O template `app/+html.tsx` não era usado na saída `single`: tags do PWA agora em `public/index.html` (manifest, theme-color, ícone iOS 180 px).
- Manifest com `id`, `scope`, atalhos e ícones maskable separados.
- Verificado em Chromium: abre offline, aviso e atualização após deploy simulado, cache antigo removido.

### Melhorias de qualidade (out/2026)
- **Testes**: Vitest + CI (typecheck e testes). Rendimento das metas agora credita todos os ciclos de 30 dias pendentes.
- **IA (Finn)**: handlers tipados — corrigidos metas (`title`→`name`), abastecimento, troca de óleo, pagamento de empréstimo (vínculo com o extrato) e plantão recebido; dados atualizados a cada rodada de ferramentas.
- **Backup**: validação com zod antes de importar, cópia automática semanal e antes de cada importação, restauração em Configurações.
- **Segurança**: `AuthGuard` nunca era renderizado (bloqueio biométrico não funcionava); agora envolve o app. Plugins nativos de biometria/notificações declarados no `app.json`.
- **Datas**: corrigido uso de `toISOString()` (dia errado após 21h; regras semanais no dia da semana errado).
- **Plantões**: `shifts.tsx` dividido em `components/shifts/*` (1395 → 764 linhas).
- **Valores em centavos**: decidido NÃO migrar o armazenamento (risco alto para dados existentes); arredondamento centralizado em `lib/money.ts` nos pontos de cálculo.

### 06/05/2026

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
- [ ] **Calendário**: Exportar vencimentos/plantões via calendário nativo do aparelho (a integração com Google foi removida para manter o app offline).
- [ ] **Scanner**: Anexar fotos de recibos via câmera.
- [ ] **Gamificação**: Medalhas por metas alcançadas.

---
*Atualizado por Antigravity em 06/05/2026 - Versão Premium 1.5.1 (Stabilization)*
