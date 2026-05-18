export const buildSalarySummaryRow = (person, advances, idField) => {
  const grossSalary = Number(person.grossSalary) || 0;
  const pendingAdvances = advances.filter((a) => a.status === 'pending');
  const totalAdvance = pendingAdvances.reduce((s, a) => s + Number(a.amount), 0);
  const finalSalary = grossSalary - totalAdvance;

  return {
    [idField]: person.id,
    name: person.name,
    mobile: person.mobile,
    grossSalary,
    totalAdvance: Number(totalAdvance.toFixed(2)),
    finalSalary: Number(finalSalary.toFixed(2)),
    advances: pendingAdvances.map((a) => ({
      id: a.id,
      advanceDate: a.advanceDate,
      amount: Number(a.amount),
      reason: a.reason,
      paymentMode: a.paymentMode,
    })),
  };
};
