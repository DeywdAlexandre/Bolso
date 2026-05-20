import { useMemo, useState, useEffect } from "react";
import { LayoutAnimation, Platform, UIManager } from "react-native";
import { useAppData } from "@/contexts/AppDataContext";

export function useLoansDashboard() {
  const { loanContacts, loans, loanPayments } = useAppData();
  const [search, setSearch] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  // Ativar LayoutAnimation no Android
  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  // Cálculos de Resumo
  const stats = useMemo(() => {
    let toReceive = 0;
    let toPay = 0;
    
    // Indicadores detalhados
    let monthlyProjection = 0;
    let interestToReceiveTotal = 0;
    let interestToReceivePending = 0;
    let interestToPayTotal = 0;
    let interestToPayPending = 0;
    let installmentsToReceiveTotal = 0;
    let installmentsToReceiveRemaining = 0;
    let installmentsToPayTotal = 0;
    let installmentsToPayRemaining = 0;

    loans.forEach((l) => {
      if (l.status === "active") {
        const payments = loanPayments.filter((p) => p.loanId === l.id);
        const paidPrincipal = payments.reduce((s, p) => s + p.principalPaid, 0);
        const paidInterest = payments.reduce((s, p) => s + p.interestPaid, 0);
        const totalPaid = paidPrincipal + paidInterest;
        
        const isLend = l.direction === "lend";
        const isMonthly = l.type === "monthly_interest";
        const remainingPrincipal = l.principalAmount - paidPrincipal;
        
        // Cálculo de Juros e Totais
        const contractedInterest = (l.principalAmount * l.interestRate) / 100;
        const totalContractedValue = l.principalAmount + contractedInterest;
        
        // Juros pendentes para Mensal considera o juros do saldo atual
        const currentPendingInterest = isMonthly 
          ? (remainingPrincipal * l.interestRate) / 100 
          : Math.max(0, contractedInterest - paidInterest);

        const currentMonthlyValue = isMonthly 
          ? currentPendingInterest 
          : (totalContractedValue / (l.installmentsCount || 1));

        const remainingTotal = Math.max(0, totalContractedValue - totalPaid);

        if (isLend) {
          toReceive += remainingPrincipal + currentPendingInterest;
          monthlyProjection += currentMonthlyValue;
          
          interestToReceiveTotal += isMonthly ? (paidInterest + currentPendingInterest) : contractedInterest;
          interestToReceivePending += currentPendingInterest;
          
          if (!isMonthly) {
            installmentsToReceiveTotal += totalContractedValue;
            installmentsToReceiveRemaining += remainingTotal;
          }
        } else {
          toPay += remainingPrincipal + currentPendingInterest;
          monthlyProjection -= currentMonthlyValue; // Saída de caixa reduz a projeção líquida
          
          interestToPayTotal += isMonthly ? (paidInterest + currentPendingInterest) : contractedInterest;
          interestToPayPending += currentPendingInterest;

          if (!isMonthly) {
            installmentsToPayTotal += totalContractedValue;
            installmentsToPayRemaining += remainingTotal;
          }
        }
      }
    });

    const netBalance = toReceive - toPay;
    const netInterestProfit = interestToReceivePending - interestToPayPending;

    return { 
      toReceive, 
      toPay, 
      monthlyProjection,
      interestToReceiveTotal,
      interestToReceivePending,
      interestToPayTotal,
      interestToPayPending,
      installmentsToReceiveTotal,
      installmentsToReceiveRemaining,
      installmentsToPayTotal,
      installmentsToPayRemaining,
      netBalance,
      netInterestProfit
    };
  }, [loans, loanPayments]);

  const filteredContacts = useMemo(() => {
    return loanContacts.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [loanContacts, search]);

  return {
    search,
    setSearch,
    isExpanded,
    toggleExpand,
    stats,
    filteredContacts,
  };
}
