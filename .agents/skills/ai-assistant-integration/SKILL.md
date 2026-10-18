---
name: ai-assistant-integration
description: Use para expandir as capacidades do assistente Finn (IA), adicionando novas tools ou melhorando o processamento de linguagem natural.
---
# AI Assistant Integration (Finn)

O assistente Finn é o coração do Prisma, permitindo comandos por voz e texto.

## Diretrizes de Implementação
1. **Tool Definition**: Novas funções para a IA devem ser definidas no array `AI_TOOLS` em `lib/aiTools.ts`.
2. **Handlers**: A lógica de execução das ferramentas deve estar no `buildToolHandlers`.
3. **Privacidade**: Processe o máximo possível localmente. Apenas o prompt e os dados filtrados necessários devem ser enviados para a API da OpenRouter.
4. **Naturalidade**: O Finn deve ser amigável e breve. Formate valores monetários sempre como `R$ 0,00` nas respostas.
5. **Ações Diretas**: Se o usuário disser "Gastei 50 com café", a IA deve chamar `add_transaction` sem pedir confirmação, agilizando o uso.

## Expandindo Habilidades
- Ao adicionar suporte a novas entidades (ex: Manutenções), sempre crie as tools correspondentes para que o Finn possa consultar/adicionar esses dados.
