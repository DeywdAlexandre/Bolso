import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Alert: { alert: () => {} }, Platform: { OS: "web" } }));

import { webAlert } from "./webAlert";
import { dismissToast, subscribeToasts, type ToastMessage } from "./toast";

describe("webAlert", () => {
  const alertSpy = vi.fn();
  const confirmSpy = vi.fn();
  let toasts: ToastMessage[] = [];
  let unsubscribe = () => {};

  beforeEach(() => {
    alertSpy.mockReset();
    confirmSpy.mockReset();
    vi.stubGlobal("alert", alertSpy);
    vi.stubGlobal("confirm", confirmSpy);
    unsubscribe = subscribeToasts((t) => (toasts = t));
  });
  afterEach(() => {
    toasts.forEach((t) => dismissToast(t.id));
    unsubscribe();
    vi.unstubAllGlobals();
  });

  it("validação/erro sem botões vira window.alert com título e mensagem", () => {
    webAlert("Valor inválido", "Informe um valor maior que zero.");
    expect(alertSpy).toHaveBeenCalledWith("Valor inválido\n\nInforme um valor maior que zero.");
    expect(toasts).toHaveLength(0);
  });

  it("confirmação de sucesso vira aviso rápido, sem interromper", () => {
    webAlert("Sucesso", "Plantão adicionado.");
    expect(alertSpy).not.toHaveBeenCalled();
    expect(toasts.map((t) => t.text)).toEqual(["Plantão adicionado."]);
    webAlert("Recebimento Confirmado", "Receita lançada.");
    expect(toasts).toHaveLength(2);
  });

  it("pergunta com Cancelar + ação usa confirm: OK executa a ação, Cancelar não", () => {
    const onDelete = vi.fn();
    const onCancel = vi.fn();
    const buttons = [{ text: "Cancelar", style: "cancel" as const, onPress: onCancel }, { text: "Excluir", style: "destructive" as const, onPress: onDelete }];

    confirmSpy.mockReturnValueOnce(true);
    webAlert("Excluir", "Tem certeza?", buttons);
    expect(onDelete).toHaveBeenCalledTimes(1);

    confirmSpy.mockReturnValueOnce(false);
    webAlert("Excluir", "Tem certeza?", buttons);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("botão único executa a ação depois do aviso", () => {
    const onOk = vi.fn();
    webAlert("Atenção", "Algo aconteceu", [{ text: "OK", onPress: onOk }]);
    expect(alertSpy).toHaveBeenCalled();
    expect(onOk).toHaveBeenCalled();
  });
});
