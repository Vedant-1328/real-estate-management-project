/** Hard-delete rows (bypass Sequelize paranoid soft delete). */
export const hardDestroy = (instance, options = {}) =>
  instance.destroy({ force: true, ...options });

export const hardDestroyWhere = (Model, where, options = {}) =>
  Model.destroy({ where, force: true, ...options });
