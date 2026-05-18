import { Op } from 'sequelize';
import { AuditLog, User } from '../models/index.js';

export const listAuditLogs = async (req, res) => {
  const { module, userId, from, to } = req.query;
  const where = {};

  if (module && module !== 'all') where.module = module;
  if (userId) where.userId = userId;
  if (from || to) {
    where.timestamp = {};
    if (from) where.timestamp[Op.gte] = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      where.timestamp[Op.lte] = end;
    }
  }

  const logs = await AuditLog.findAll({
    where,
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
    order: [['timestamp', 'DESC']],
    limit: 500,
  });

  res.json({
    success: true,
    data: logs.map((log) => {
      const plain = log.get({ plain: true });
      return {
        ...plain,
        userName: plain.user?.name,
        userEmail: plain.user?.email,
      };
    }),
  });
};
