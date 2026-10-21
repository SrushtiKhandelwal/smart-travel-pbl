// Simulated sandbox gateway. No real money, no card data. Rule: card token "tok_fail" is declined, anything else succeeds.
export function simulatePayment(token: string | undefined, amount: number): "SUCCESS" | "FAILED" {
  if (amount <= 0) return "FAILED";
  if (token === "tok_fail") return "FAILED";
  return "SUCCESS";
}
