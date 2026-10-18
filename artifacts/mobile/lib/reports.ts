import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { formatCurrency, formatDate } from "./format";
import type { Loan, LoanContact, LoanPayment } from "./types";

export async function generateLoanReport(
  loan: Loan,
  contact: LoanContact,
  payments: LoanPayment[]
) {
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalInterest = payments.reduce((sum, p) => sum + p.interestPaid, 0);
  const totalPrincipalPaid = payments.reduce((sum, p) => sum + p.principalPaid, 0);
  const remainingBalance = loan.principalAmount - totalPrincipalPaid;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            padding: 40px;
            color: #333;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #2ECC71;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2ECC71;
          }
          .report-title {
            text-align: right;
          }
          .report-title h1 {
            margin: 0;
            font-size: 20px;
            color: #666;
          }
          .report-title p {
            margin: 5px 0 0;
            font-size: 12px;
            color: #999;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            color: #2ECC71;
            margin-bottom: 15px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .info-item label {
            display: block;
            font-size: 11px;
            color: #999;
            margin-bottom: 5px;
          }
          .info-item span {
            font-size: 16px;
            font-weight: 600;
          }
          .summary-card {
            background: #F9F9F9;
            border-radius: 12px;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            border: 1px solid #EEE;
          }
          .summary-box {
            text-align: center;
            flex: 1;
          }
          .summary-box label {
            display: block;
            font-size: 10px;
            color: #777;
            margin-bottom: 8px;
          }
          .summary-box span {
            font-size: 18px;
            font-weight: bold;
          }
          .balance span {
            color: #E74C3C;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th {
            text-align: left;
            font-size: 12px;
            color: #666;
            padding: 12px 8px;
            border-bottom: 1px solid #EEE;
          }
          td {
            font-size: 13px;
            padding: 12px 8px;
            border-bottom: 1px solid #F5F5F5;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 10px;
            color: #AAA;
            border-top: 1px solid #EEE;
            padding-top: 20px;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            background: #2ECC7122;
            color: #2ECC71;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Prisma</div>
          <div class="report-title">
            <h1>Extrato de Empréstimo</h1>
            <p>Gerado em ${formatDate(new Date().toISOString())}</p>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Informações do Cliente</div>
          <div class="info-grid">
            <div class="info-item">
              <label>Cliente</label>
              <span>${contact.name}</span>
            </div>
            <div class="info-item">
              <label>Descrição</label>
              <span>${loan.description}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Resumo do Contrato</div>
          <div class="summary-card">
            <div class="summary-box">
              <label>Valor Original</label>
              <span>${formatCurrency(loan.principalAmount)}</span>
            </div>
            <div class="summary-box">
              <label>Total Pago</label>
              <span>${formatCurrency(totalPaid)}</span>
            </div>
            <div class="summary-box balance">
              <label>Saldo Devedor</label>
              <span>${formatCurrency(remainingBalance)}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Histórico de Pagamentos</div>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Valor Pago</th>
                <th>Amortização</th>
                <th>Juros</th>
              </tr>
            </thead>
            <tbody>
              ${payments.map(p => `
                <tr>
                  <td>${formatDate(p.date)}</td>
                  <td><b>${formatCurrency(p.amount)}</b></td>
                  <td>${formatCurrency(p.principalPaid)}</td>
                  <td>${formatCurrency(p.interestPaid)}</td>
                </tr>
              `).join('')}
              ${payments.length === 0 ? '<tr><td colspan="4" style="text-align:center; color:#999;">Nenhum pagamento registrado</td></tr>' : ''}
            </tbody>
          </table>
        </div>

        <div class="footer">
          Este documento é um informativo gerado pelo aplicativo Prisma.<br/>
          Fim do extrato.
        </div>
      </body>
    </html>
  `;

  try {
    if (!Print.printToFileAsync || !Sharing.shareAsync) {
      alert("A função de PDF não está disponível nesta versão do app (Build Conservador).");
      return;
    }

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  } catch (error) {
    console.warn("Erro ao gerar ou compartilhar PDF (módulo nativo pode estar ausente):", error);
    alert("Não foi possível gerar o PDF. Verifique se o app tem as permissões necessárias.");
  }
}
