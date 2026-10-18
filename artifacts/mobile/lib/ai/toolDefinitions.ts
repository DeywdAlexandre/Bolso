import type { ToolDefinition } from "../openrouter";

export const AI_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "add_transaction",
      description:
        "Adiciona uma transação financeira (entrada/income ou gasto/expense). Use quando o usuário mencionar um gasto ou entrada para registrar.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["income", "expense"], description: "Tipo: 'income' para entrada, 'expense' para gasto" },
          amount: { type: "number", description: "Valor positivo em reais (ex: 50.00)" },
          category: {
            type: "string",
            description: "Nome da categoria (ex: 'Alimentação', 'Salário'). Veja a lista em get_categories.",
          },
          description: { type: "string", description: "Breve descrição opcional (ex: 'almoço no restaurante')" },
          date: { type: "string", description: "Data ISO opcional (YYYY-MM-DD). Padrão é hoje." },
          account: {
            type: "string",
            description: "Nome da conta/banco/carteira de onde saiu ou entrou o dinheiro (veja list_accounts). Sem ela, usa a conta padrão.",
          },
          paymentMethod: {
            type: "string",
            enum: ["pix", "debit", "cash", "boleto", "transfer", "other"],
            description: "Forma de pagamento: pix, debit (débito), cash (dinheiro), boleto, transfer (TED/transferência) ou other. Em cartão de crédito é automático.",
          },
          installments: {
            type: "number",
            description: "Só para compra no cartão de crédito: número de parcelas. Nesse caso 'amount' é o valor TOTAL da compra (ex.: 'notebook em 12x de 100' = amount 1200, installments 12).",
          },
        },
        required: ["type", "amount", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_transactions",
      description: "Lista transações do usuário com filtros opcionais. Use para consultas como 'meus gastos com comida esse mês'.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["income", "expense", "all"], description: "Filtrar por tipo" },
          category: { type: "string", description: "Filtrar por nome da categoria" },
          month: { type: "number", description: "Mês 1-12 (opcional)" },
          year: { type: "number", description: "Ano 4 dígitos (opcional)" },
          account: { type: "string", description: "Filtrar por nome da conta/banco" },
          limit: { type: "number", description: "Máximo de resultados (padrão 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_summary",
      description: "Retorna resumo financeiro (total de entradas, gastos, saldo, gastos por categoria) para um período.",
      parameters: {
        type: "object",
        properties: {
          month: { type: "number", description: "Mês 1-12. Se omitido junto a year, usa mês atual." },
          year: { type: "number", description: "Ano 4 dígitos. Se omitido, usa ano atual." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_categories",
      description: "Retorna a lista de categorias disponíveis (entrada e gasto).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "add_recurring",
      description: "Adiciona um gasto/entrada recorrente que se repete todo mês em um dia específico (ex: aluguel, assinaturas).",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["income", "expense"] },
          amount: { type: "number", description: "Valor positivo em reais" },
          category: { type: "string", description: "Nome da categoria" },
          description: { type: "string", description: "Descrição (ex: 'Netflix', 'Aluguel')" },
          dayOfMonth: { type: "number", description: "Dia do mês (1-31)" },
          account: { type: "string", description: "Nome da conta/banco (veja list_accounts). Sem ela, usa a conta padrão." },
          paymentMethod: { type: "string", enum: ["pix", "debit", "cash", "boleto", "transfer", "other"] },
        },
        required: ["type", "amount", "category", "dayOfMonth"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_accounts",
      description:
        "Lista as contas do usuário (bancos, carteira, poupança) com o saldo atual de cada uma, o valor 'Sem conta' e o total. Use para perguntas como 'quanto tenho no Nubank?' ou 'quanto tenho no total?'.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_card_invoice",
      description:
        "Detalha a fatura de um cartão de crédito: total, fechamento, vencimento, situação (aberta/fechada/vencida/paga), valor pago e faltante, e os itens. Também devolve as parcelas faltantes de cada compra parcelada e o limite disponível.",
      parameters: {
        type: "object",
        properties: {
          card: { type: "string", description: "Nome do cartão (veja list_accounts)" },
          month: { type: "string", description: "Mês em que a fatura fecha, no formato YYYY-MM. Sem ele, usa a fatura atual." },
        },
        required: ["card"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "transfer_between_accounts",
      description:
        "Move dinheiro de uma conta para outra (ex.: sacar do banco para a carteira, Pix para si mesmo). Não é gasto nem entrada: só muda o saldo das duas contas.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "Nome da conta de origem (veja list_accounts)" },
          to: { type: "string", description: "Nome da conta de destino" },
          amount: { type: "number", description: "Valor positivo em reais" },
          date: { type: "string", description: "Data ISO opcional (YYYY-MM-DD). Padrão é hoje." },
          note: { type: "string", description: "Observação opcional" },
        },
        required: ["from", "to", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_transaction",
      description: "Remove uma transação. Forneça o id se já souber, senão uma descrição para buscar.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          description: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_loan_contact",
      description: "Adiciona uma nova pessoa ao módulo de Empréstimos.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome completo da pessoa" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_loan_contacts",
      description: "Lista as pessoas cadastradas no módulo de empréstimos e seus saldos devedores ou a receber.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_loans",
      description: "Lista os empréstimos ativos de uma pessoa específica ou todos.",
      parameters: {
        type: "object",
        properties: {
          contactName: { type: "string", description: "Opcional: nome da pessoa para filtrar" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_loan_payment",
      description: "Registra um pagamento ou recebimento referente a um empréstimo.",
      parameters: {
        type: "object",
        properties: {
          loanDescription: { type: "string", description: "Descrição do empréstimo para identificar qual pagar (ex: 'reforma')" },
          amount: { type: "number", description: "Valor pago/recebido em reais" },
          addToExtrat: { type: "boolean", description: "Se deve lançar também no extrato principal (padrão true)" },
        },
        required: ["loanDescription", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_vehicles",
      description: "Lista os veículos cadastrados na garagem do usuário.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "add_fueling",
      description: "Registra um novo abastecimento de combustível.",
      parameters: {
        type: "object",
        properties: {
          vehicleName: { type: "string", description: "Nome ou placa do veículo (ex: 'Honda Civic' ou 'ABC-1234')" },
          amount: { type: "number", description: "Valor total pago em reais" },
          liters: { type: "number", description: "Quantidade de litros abastecidos" },
          odometer: { type: "number", description: "Quilometragem atual (odômetro) do veículo" },
          date: { type: "string", description: "Opcional: Data ISO (YYYY-MM-DD). Padrão é hoje." },
          tankStatus: { type: "string", enum: ["full", "reserve", "partial"], description: "Estado do tanque ao chegar no posto. Use 'full' se encheu, 'reserve' se estava na reserva, ou 'partial' se foi um abastecimento comum (padrão)." },
        },
        required: ["vehicleName", "amount", "liters", "odometer"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_oil_change",
      description: "Registra uma troca de óleo do motor.",
      parameters: {
        type: "object",
        properties: {
          vehicleName: { type: "string", description: "Nome ou placa do veículo" },
          odometer: { type: "number", description: "Quilometragem no momento da troca" },
          nextChangeOdometer: { type: "number", description: "Quilometragem prevista para a próxima troca" },
          date: { type: "string", description: "Opcional: Data ISO. Padrão é hoje." },
        },
        required: ["vehicleName", "odometer", "nextChangeOdometer"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_vehicle_stats",
      description:
        "Retorna o consumo (KM/L médio), os trechos medidos de consumo (do mais recente ao mais antigo, com datas, km, litros e km/L), o melhor e o pior trecho, o trecho em andamento e o status de manutenção de um veículo.",
      parameters: {
        type: "object",
        properties: {
          vehicleName: { type: "string", description: "Nome ou placa do veículo" },
          limit: { type: "number", description: "Quantos trechos recentes devolver (padrão 10)" },
        },
        required: ["vehicleName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_goals",
      description: "Lista as metas de economia (investimentos) atuais do usuário.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "add_goal_deposit",
      description: "Registra um depósito em uma meta de economia específica.",
      parameters: {
        type: "object",
        properties: {
          goalTitle: { type: "string", description: "Título ou parte do título da meta" },
          amount: { type: "number", description: "Valor a ser guardado/investido" },
        },
        required: ["goalTitle", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_loan_report",
      description: "Gera e compartilha um arquivo PDF com o extrato detalhado de um empréstimo.",
      parameters: {
        type: "object",
        properties: {
          loanDescription: { type: "string", description: "Descrição do empréstimo para gerar o PDF" },
        },
        required: ["loanDescription"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_vehicle_expense",
      description: "Registra um gasto extra ou manutenção variada com o veículo (lava-jato, mecânica, pneus, etc).",
      parameters: {
        type: "object",
        properties: {
          vehicleName: { type: "string", description: "Nome ou placa do veículo" },
          description: { type: "string", description: "Descrição do gasto (ex: 'Lava-jato', 'Conserto pneu')" },
          amount: { type: "number", description: "Valor total pago em reais" },
          odometer: { type: "number", description: "Opcional: Quilometragem atual" },
          date: { type: "string", description: "Opcional: Data ISO. Padrão é hoje." },
        },
        required: ["vehicleName", "description", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_shifts",
      description: "Lista os plantões e serviços agendados para o usuário. Útil para saber a escala atual e faturamento.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["ordinary", "extra", "all"], description: "Filtrar por tipo" },
          month: { type: "number", description: "Mês (1-12)" },
          year: { type: "number", description: "Ano (ex: 2026)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_shift_rule",
      description: "Cria uma escala/regra de plantões recorrentes (ex: 12x36 ou semanal fixa) e gera automaticamente a agenda futura.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome da escala/local de serviço (ex: 'Hospital Unimed')" },
          type: { type: "string", enum: ["ordinary", "extra"], description: "Ordinário ou Extra (remunerado)" },
          value: { type: "number", description: "Valor a receber por plantão (apenas para Extra)" },
          recurrenceType: { type: "string", enum: ["rotative", "weekly"], description: "Tipo de escala: rotative (ex: 12x36) ou weekly (semanal fixa)" },
          startDate: { type: "string", description: "Data de início da escala no formato YYYY-MM-DD" },
          workHours: { type: "number", description: "Horas de trabalho no ciclo rotativo (ex: 12)" },
          offHours: { type: "number", description: "Horas de folga no ciclo rotativo (ex: 36)" },
          weekDays: {
            type: "array",
            items: { type: "number" },
            description: "Dias da semana (0=Dom, 1=Seg, ..., 6=Sáb) para escala semanal fixa"
          },
          startTime: { type: "string", description: "Horário de início (ex: '07:00')" },
          endTime: { type: "string", description: "Horário de término (ex: '19:00')" },
        },
        required: ["name", "type", "recurrenceType", "startDate", "startTime", "endTime"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_shift_single",
      description: "Adiciona um plantão avulso específico para uma data única.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do plantão" },
          type: { type: "string", enum: ["ordinary", "extra"], description: "Ordinário ou Extra" },
          value: { type: "number", description: "Valor a receber por plantão (apenas para Extra)" },
          date: { type: "string", description: "Data do plantão (YYYY-MM-DD)" },
          startTime: { type: "string", description: "Horário de início (ex: '07:00')" },
          endTime: { type: "string", description: "Horário de término (ex: '19:00')" },
        },
        required: ["name", "type", "date", "startTime", "endTime"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "toggle_shift_paid",
      description: "Marca ou desmarca um plantão extra como recebido e lança o valor no extrato financeiro.",
      parameters: {
        type: "object",
        properties: {
          shiftDate: { type: "string", description: "Data do plantão (YYYY-MM-DD)" },
          shiftName: { type: "string", description: "Nome ou parte do nome do plantão" },
        },
        required: ["shiftDate", "shiftName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_morning_briefing",
      description: "Retorna o briefing completo do dia atual: escalas/plantões de hoje, contas recorrentes vencendo ou atrasadas, parcelas de empréstimo e metas.",
      parameters: { type: "object", properties: {} },
    },
  },
];
