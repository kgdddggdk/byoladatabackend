const wallets = new Map();
const fundingRequests = new Map();
const transactions = [];

function getBalance(customerId) {
  return wallets.get(customerId) || 0;
}

function credit(customerId, amount) {
  const bal = getBalance(customerId) + amount;
  wallets.set(customerId, bal);
  return bal;
}

function debit(customerId, amount) {
  const bal = getBalance(customerId);
  if (bal < amount) throw new Error("Insufficient wallet balance");
  wallets.set(customerId, bal - amount);
  return bal - amount;
}

function createFundingRequest(reference, customerId, amount) {
  fundingRequests.set(reference, { customerId, amount, status: "PENDING" });
}

function getFundingRequest(reference) {
  return fundingRequests.get(reference);
}

function markFundingStatus(reference, status) {
  const f = fundingRequests.get(reference);
  if (f) f.status = status;
  return f;
}

function logTransaction(entry) {
  transactions.push({ id: `TXN-${Date.now()}`, date: Date.now(), ...entry });
}

function listTransactions(customerId) {
  return transactions.filter((t) => !customerId || t.customerId === customerId);
}

module.exports = {
  getBalance,
  credit,
  debit,
  createFundingRequest,
  getFundingRequest,
  markFundingStatus,
  logTransaction,
  listTransactions,
};
