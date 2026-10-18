---
name: offline-first-storage
description: Use para gerenciar a persistência de dados locais usando AsyncStorage e SecureStore.
---
# Offline-First Storage (Prisma)

O Prisma é um app focado em privacidade e funcionamento offline. Todos os dados residem no aparelho do usuário.

## Regras de Persistência
1. **AsyncStorage**: Use para dados comuns (transações, veículos, categorias) através das funções `loadJson` e `saveJson` em `lib/storage.ts`.
2. **SecureStore**: Use **exclusivamente** para dados sensíveis como API Keys (OpenRouter) em `lib/secureStorage.ts`.
3. **Consistência**: Sempre que adicionar/remover um item, atualize o estado global no `AppDataContext` e dispare o salvamento assíncrono imediatamente.
4. **Tipagem**: Mantenha os tipos em `lib/types.ts` sincronizados com as estruturas salvas.

## Estrutura de Chaves (STORAGE_KEYS)
- Sempre siga o padrão `@prisma/[entity]/v1` para chaves do AsyncStorage.
- Nunca salve dados financeiros no SecureStore (ele é mais lento e tem limite de tamanho); use-o apenas para segredos.
