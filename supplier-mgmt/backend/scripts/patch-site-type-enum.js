import sequelize from '../config/db.js';

await sequelize.query(
  "ALTER TABLE sites MODIFY site_type ENUM('pickup', 'delivery', 'both', 'site_by_site') NOT NULL DEFAULT 'both'"
);
console.log('sites.site_type enum updated');
await sequelize.close();
