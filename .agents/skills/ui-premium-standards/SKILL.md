---
name: ui-premium-standards
description: Use quando precisar criar ou modificar componentes de interface para garantir o padrão visual premium (Mercado Pago style).
---
# UI Premium Standards (Prisma)

Esta habilidade define os padrões estéticos e de experiência do usuário para o app Prisma, inspirados no estilo "Mercado Pago" e designs de alta fidelidade.

## Diretrizes de Design
1. **Dark Mode First**: O app é nativamente Dark Mode. Use a paleta de cores definida em `hooks/useColors.ts`.
2. **Botão IA Saliente**: O botão central da TabBar deve permanecer saliente (`marginTop: -28`, `borderRadius: 30`, `borderWidth: 5`).
3. **Feedback Tátil (Haptics)**: Sempre adicione `Haptics.impactAsync` ou `Haptics.selectionAsync` em interações importantes (cliques em botões principais, abrir chat, deletar itens).
4. **Tipografia**: Use prioritariamente a família "Inter" (`Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold`).
5. **Espaçamento e Bordas**: Use bordas arredondadas generosas (`borderRadius: 14` a `18`) e evite designs "quadrados".

## Componentes Chave
- `TransactionItem`: Para listas de movimentações.
- `CategoryBreakdown`: Para gráficos e divisões por categoria.
