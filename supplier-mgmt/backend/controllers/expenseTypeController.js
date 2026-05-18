import { ExpenseType } from '../models/index.js';

export const listExpenseTypes = async (_req, res) => {
  const expenseTypes = await ExpenseType.findAll({ order: [['name', 'ASC']] });
  res.json({ success: true, data: expenseTypes });
};

export const createExpenseType = async (req, res) => {
  const expenseType = await ExpenseType.create({
    name: req.body.name,
    description: req.body.description || null,
    status: req.body.status || 'active',
  });
  res.status(201).json({ success: true, data: expenseType });
};

export const updateExpenseType = async (req, res) => {
  const expenseType = await ExpenseType.findByPk(req.params.id);
  if (!expenseType) {
    return res.status(404).json({ success: false, message: 'Expense type not found' });
  }

  ['name', 'description', 'status'].forEach((field) => {
    if (req.body[field] !== undefined) {
      expenseType[field] = req.body[field] === '' ? null : req.body[field];
    }
  });

  await expenseType.save();
  res.json({ success: true, data: expenseType });
};

export const deleteExpenseType = async (req, res) => {
  const expenseType = await ExpenseType.findByPk(req.params.id);
  if (!expenseType) {
    return res.status(404).json({ success: false, message: 'Expense type not found' });
  }
  await expenseType.destroy();
  res.json({ success: true, message: 'Expense type deleted' });
};
