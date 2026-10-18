# Prisma — Finanças, veículos, empréstimos e plantões

App mobile (Expo / React Native) em português brasileiro, offline-first, para controlar finanças pessoais, veículos, empréstimos, metas e escalas de plantão. (Nome anterior: "Bolso".)

## Visão geral

- **Tema**: dark mode premium inspirado em Mercado Pago / Robinhood, com primary verde esmeralda.
- **Idioma**: pt-BR. Moeda BRL (R$).
- **Persistência**: 100% local — AsyncStorage (chaves `@prisma/<entidade>/v1`) e expo-secure-store (com fallback localStorage no web) para a chave da API.
- **Sem backend para o app.** `artifacts/api-server` é apenas um servidor Express mínimo (health check) e `artifacts/mockup-sandbox` um sandbox de mockups.
- **Migração**: instalações antigas (chaves `@bolso/*`) são copiadas para `@prisma/*` na primeira abertura (`migrateLegacyStorage` em `lib/storage.ts`). Backups com `app: "Bolso"` continuam importáveis.

## Funcionalidades

- **Finanças**: transações, dashboard por período (mês/ano/intervalo), histórico estilo extrato com filtros, categorias personalizadas e recorrências/assinaturas aplicadas automaticamente.
- **Metas**: aportes, simulador CDI/poupança e rendimento automático.
- **Veículos**: KM/L por trechos Cheio→Cheio e Reserva→Reserva (regras abaixo), R$/km, troca de óleo, gastos extras e gasto vinculado em Transporte.
- **Empréstimos**: contatos, dívidas, parcelas fixas/variáveis, agenda de vencimentos e extratos em PDF.
- **Plantões**: regras de escala, geração de turnos, templates e calendário.
- **Finn (IA)**: bolinha/hub de chat com tool calling (OpenRouter), multi-round (até 4 rodadas), ditado por voz e briefing matinal.
- **Segurança e dados**: bloqueio biométrico (`AuthGuard`, só em build nativo), ocultação de saldo, backup/restauração em JSON validada (`lib/backup.ts`, zod), cópia automática semanal local (`lib/snapshots.ts`, 3 mais recentes, também antes de cada importação) e notificações locais de vencimento.
- **Configurações**: chave OpenRouter, modelo (Claude Haiku 5.5 padrão — `anthropic/claude-haiku-5.5`, GPT-4o mini, DeepSeek V3; lista em `lib/models.ts`), tema, abas visíveis e reset de dados.
- A integração com Google (Sheets/Calendar) foi removida para manter o app 100% offline.

## Estrutura

```
artifacts/mobile/
  app/
    _layout.tsx                  Stack root + providers + ChatSheet overlay + migração de storage
    (tabs)/                      index (Início), finance, vehicles, goals, loans, shifts
                                 (abas visíveis configuráveis em settings/customize-tabs)
    transaction/ recurring/      Formulários e listas de transações e fixos
    vehicle/ fueling/ oilchange/ Veículos, abastecimentos e troca de óleo
    loans/ goals/                Empréstimos (contatos, agenda, detalhes) e metas
    history.tsx categories.tsx settings.tsx
  components/                    UI atômica e widgets (dashboard/, home/, loans/, vehicle/, settings/)
  contexts/                      AppDataContext (une os estados), SettingsContext, ChatContext
  hooks/state/                   Estado + persistência por domínio (transactions, vehicles, loans, goals, shifts)
  hooks/                         useDashboard, useBackup, useVehicle, useSpeechRecognition...
  lib/
    storage.ts secureStorage.ts  AsyncStorage (@prisma/*) e SecureStore
    openrouter.ts                Cliente OpenRouter
    ai/                          systemPrompt, toolDefinitions, toolTypes e handlers/ por domínio
    vehicleStats.ts reports.ts notifications.ts format.ts types.ts categories.ts
  constants/colors.ts            Paleta
```

## Contas e carteira (`lib/accounts.ts`, testado)

- **Conta** (`Account`): banco, carteira ou poupança, com `initialBalance` em `balanceDate`. Saldo = inicial + lançamentos da conta **a partir dessa data** (os anteriores já estão embutidos). Cadastro em Configurações → Bancos e carteira (`app/accounts`); saldos na tela inicial (`AccountsWidget`).
- **Lançamento e fixo** têm `accountId` e `paymentMethod` opcionais (Pix, débito, dinheiro, boleto, transferência, outro). O formulário (`AccountMethodFields`) vem com a última conta/forma usada; tocar no chip escolhido desmarca ("Sem conta"). Os campos só aparecem se houver conta.
- **"Sem conta"**: lançamentos sem conta feitos depois que as contas passaram a existir entram nesse grupo (e no total); o histórico anterior não conta (já está nos saldos informados). Sem contas cadastradas, o saldo geral é o acumulado de sempre. Total = soma das contas + "Sem conta".
- **Conta padrão** (`settings.defaultAccountId`): usada em lançamentos automáticos (fixos efetivados, abastecimento, empréstimo, meta, plantão). Formulários manuais passam `useDefaultAccount: false` e respeitam "Sem conta".
- **Finn**: `list_accounts` (saldos por conta, "Sem conta", total) e `account`/`paymentMethod` em `add_transaction`, `add_recurring` e `list_transactions`. Sem conta informada usa a padrão e responde `accountName`; conta/forma inválida devolve erro com as opções.
- **Transferências** (`Transfer`, `app/accounts/transfer.tsx`): movem dinheiro entre contas sem virar gasto/entrada (não entram em Finanças nem nos relatórios); aparecem no extrato (`TransferItem`) e entram no saldo das duas contas e no backup. Finn: `transfer_between_accounts`.
- **Cartão de crédito** (`lib/cards.ts`, testado): conta do tipo `card` com `closingDay`, `dueDay` e `creditLimit`; o saldo é a dívida (negativo). Compra no cartão é um gasto normal na conta do cartão (forma "Crédito" automática); **parcelada** vira N lançamentos mensais (`installmentGroupId/Index/Total`), um por fatura (a soma é exata: o resto dos centavos vai para a última). A fatura é por mês de fechamento (compra até o dia do fechamento entra na fatura do mês). **Pagar a fatura** é uma transferência banco → cartão (não é gasto), que abate as faturas mais antigas primeiro. Cartões **não entram** em "dinheiro total"; têm tela própria (`app/cards/[id].tsx`: faturas por mês, status aberta/fechada/vencida/paga, parcelas faltantes, limite) e aparecem na tela inicial. Excluir uma parcela pergunta se remove todas. Finn: `installments` em `add_transaction`, `get_card_invoice` e cartões em `list_accounts`.
- **Relatórios**: Finanças tem "Gastos por origem" (`AccountBreakdown`, `lib/breakdown.ts`): gastos/entradas do período por conta ou por forma de pagamento, com participação.
- **Arquivar** em vez de excluir (o saldo deixa de contar no total); corrigir saldo recalcula o saldo inicial. Contas entram no backup. Cartão de crédito (fatura) e a leitura de faturas pela IA são as próximas etapas; "Crédito" ainda não é uma forma de pagamento.

## Consumo (km/L) — regras (`lib/fuelSegments.ts`, testadas)

O status do abastecimento diz como estava o tanque ao abastecer:
- **Cheio→Cheio**: litros = parciais/reservas do meio + o abastecimento do Cheio final. Os litros do Cheio inicial não entram.
- **Reserva→Reserva**: litros = abastecimento da Reserva inicial + o que foi abastecido no meio (parciais, cheios). Os litros da Reserva final não entram (viram o início do próximo trecho).
- **Parcial**: nunca fecha uma medição; seus litros são somados ao trecho em andamento.
- O Finn recebe os mesmos trechos pela ferramenta `get_vehicle_stats` (`lib/ai/vehiclePayload.ts`): trechos medidos (mais recente primeiro, parâmetro `limit`), melhor/pior trecho e trecho em andamento; o prompt explica as regras e proíbe inventar km/L.
- Na tela do veículo, `VehicleSegmentsCard` lista os trechos medidos (método, datas, km, litros, km/L, R$/km) e o **trecho em andamento** (`computeOpenSegment`: o que já rodou/abasteceu desde o último Cheio ou Reserva e quando ele fecha).
- Os dois métodos coexistem; trechos que se sobrepõem não são contados duas vezes (fica o conjunto que mede mais km). A ordem é pelo odômetro (empate: data). Odômetro repetido/regressivo e trechos sem litros são ignorados.

## PWA (web)

- **Instalar**: `lib/install.ts` captura `beforeinstallprompt`; `PwaBanners` mostra o convite (Chrome/Android: um toque; iPhone/Safari: passo a passo) e o adia por 14 dias ao fechar; Configurações → "Instalar aplicativo" aparece sempre que o app não está instalado. Só funciona com manifest + service worker em HTTPS.

- **Template HTML**: a saída web é `single`, então `app/+html.tsx` **não** é usado. As tags do PWA (manifest, `theme-color`, metatags iOS, ícones) ficam em `artifacts/mobile/public/index.html`, que o Expo usa como template.
- **Service worker** (`public/sw.js`, registrado em `lib/pwa.ts`, só em produção): HTML com rede primeiro e cópia offline (timeout 4 s); arquivos com hash (`/_expo/static`, `/assets`) com cache primeiro; ícones/manifest com stale-while-revalidate; domínios externos (OpenRouter) nunca passam pelo cache. Para invalidar tudo, aumente `VERSION` em `sw.js`.
- **Nova versão**: `watchForNewVersion` compara os bundles do HTML do servidor com os que estão rodando (ao voltar ao app, ao reconectar e a cada 15 min) e o `UpdateBanner` oferece "Atualizar". O `sw.js` não muda a cada deploy: o que muda é o hash do bundle.
- **Manifest**: `id`, `scope`, atalhos (Novo gasto, Plantões, Gastos fixos) e ícones `any`/`maskable` separados. Os atalhos e rotas profundas exigem que o host sirva `index.html` como fallback (SPA).
- Para testar localmente: `npx expo export -p web --output-dir <dir>` e servir `<dir>` com fallback para `index.html` (o service worker só roda em HTTPS ou localhost).

## Qualidade

- `pnpm run typecheck` e `pnpm test` (Vitest, em `artifacts/mobile`) rodam no CI (`.github/workflows/ci.yml`).
- Regras puras testadas: `vehicleStats`, `goalYield` (rendimento mensal composto), `recurring`, `backup`, `format`/`money`.
- Datas: sempre locais via `toIsoDay` / `localDayStart` (nunca `toISOString().split("T")`, que vira o dia seguinte após 21h no Brasil). Valores monetários: arredondar com `roundMoney`/`sumMoney` (`lib/money.ts`).
- Handlers da IA (`lib/ai/handlers`) são tipados com `lib/types`; `ChatContext` os reconstrói a cada rodada com o estado mais recente.

## Notas técnicas

- O contexto de dados aplica recorrências quando o app abre: para cada recorrência ativa cujo `dayOfMonth` já passou no mês corrente e ainda não tem `lastApplied` neste mês, gera uma transação automaticamente e marca `lastApplied`.
- O ChatContext executa rodadas de tool calling reais: enquanto o modelo retornar `tool_calls`, ele executa, anexa os resultados como mensagens role=`tool` e refaz a chamada. Limite: 4 rodadas.
- A chave da API nunca aparece em logs e é armazenada em SecureStore (Keychain/Keystore). No web, cai para `localStorage` (apenas para preview de desenvolvimento).
- Toda comunicação com OpenRouter usa `expo/fetch` para compatibilidade com React Native.

## Pacotes adicionados além do scaffold

- `@react-native-async-storage/async-storage` (já no scaffold)
- `expo-secure-store@~15.0.8` (pinado à versão do SDK 54)
- `expo-speech-recognition`
- `date-fns`
- `expo-updates` (~29.0.17) — habilita atualizações OTA via canal `preview`
- `babel-preset-expo` — necessário para `eas update` rodar `expo export` localmente

## Atualizações OTA

Sempre que mudar SÓ código JS (telas, lógica, prompt), publicar com:

```bash
EAS_NO_VCS=1 npx eas-cli@latest update --channel preview --message "descrição"
```

O app instalado baixa a atualização na próxima abertura. Mudanças nativas (deps com código nativo, permissões, ícone, splash) ainda exigem APK novo.

## Build (gerar APK com EAS)

Configurado em `artifacts/mobile/eas.json` com 3 perfis:

- **development** — APK com dev client (para testes em ambiente local).
- **preview** — APK Android distribuição interna (instala diretamente no celular). É o perfil recomendado para o usuário gerar e usar.
- **production** — App Bundle (`.aab`) para Play Store, com auto-incremento.

Identidade do app: `com.prisma.app` (Android `package` + iOS `bundleIdentifier`).

Comandos a partir de `artifacts/mobile/`:

```bash
# 1. Login na conta Expo (uma vez)
npx eas-cli@latest login

# 2. Inicializar projeto EAS (uma vez — cria o projectId em app.json)
npx eas-cli@latest init

# 3. Gerar APK de teste (preview)
npx eas-cli@latest build --platform android --profile preview
```

O build roda na nuvem da Expo (gratuito até o limite mensal) e ao final entrega um link `.apk` para baixar e instalar no celular. Atualizações JS subsequentes podem ser entregues via `npx eas-cli@latest update --channel preview` sem precisar gerar APK novo.

Quando mudar algo nativo (libs novas, permissões, ícone), gerar APK novo. Reinstalar por cima preserva todos os dados locais.
