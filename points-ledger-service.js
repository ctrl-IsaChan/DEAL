const PointsLedgerService = {
  getLedger() { return JSON.parse(localStorage.getItem('deal-points-ledger') || '[]'); },
  addTransaction(transaction) {
    const ledger = this.getLedger();
    ledger.push({ id: crypto.randomUUID(), userId: transaction.userId || 'prototype-user', type: transaction.type, amount: transaction.amount, source: transaction.source, createdAt: new Date().toISOString(), metadata: transaction.metadata || {} });
    localStorage.setItem('deal-points-ledger', JSON.stringify(ledger));
  },
  getBalance() { return this.getLedger().reduce((total, transaction) => total + (transaction.type === 'redeem' ? -transaction.amount : transaction.amount), 124); },
  awardWalkingMilestones(steps) {
    const milestone = Math.min(Math.floor(steps / 500), 20);
    const earned = this.getLedger().filter(transaction => transaction.source === 'walking').reduce((total, transaction) => total + transaction.amount, 0);
    for (let next = earned + 1; next <= milestone; next += 1) this.addTransaction({ type: 'earn', amount: 1, source: 'walking', metadata: { stepMilestone: next * 500 } });
  }
};
if (typeof window !== 'undefined') window.PointsLedgerService = PointsLedgerService;
