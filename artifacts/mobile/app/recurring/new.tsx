import React from "react";
import { router } from "expo-router";

import { RecurringForm } from "@/components/RecurringForm";
import { useAppData } from "@/contexts/AppDataContext";

export default function NewRecurringScreen() {
  const { addRecurring } = useAppData();
  return (
    <RecurringForm
      submitLabel="Adicionar"
      rememberLast
      onSubmit={async (values) => {
        await addRecurring(values);
        router.back();
      }}
    />
  );
}
