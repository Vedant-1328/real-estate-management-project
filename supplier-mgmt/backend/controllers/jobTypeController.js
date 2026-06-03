import { CompanyJobRate, JobType } from '../models/index.js';
import { hardDestroy, hardDestroyWhere } from '../utils/hardDestroy.js';

export const listJobTypes = async (req, res) => {
  const jobTypes = (await JobType.findAll()).sort((a, b) => a.name.localeCompare(b.name));
  res.json({ success: true, data: jobTypes });
};

export const createJobType = async (req, res) => {
  const jobType = await JobType.create({
    name: req.body.name,
    description: req.body.description || null,
    defaultUnit: req.body.defaultUnit || 'trip',
    status: req.body.status || 'active',
  });
  res.status(201).json({ success: true, data: jobType });
};

export const updateJobType = async (req, res) => {
  const jobType = await JobType.findByPk(req.params.id);
  if (!jobType) {
    return res.status(404).json({ success: false, message: 'Job type not found' });
  }

  const fields = ['name', 'description', 'defaultUnit', 'status'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      jobType[field] = req.body[field] === '' ? null : req.body[field];
    }
  });

  await jobType.save();
  res.json({ success: true, data: jobType });
};

export const deleteJobType = async (req, res) => {
  const jobType = await JobType.findByPk(req.params.id);
  if (!jobType) {
    return res.status(404).json({ success: false, message: 'Job type not found' });
  }
  await hardDestroyWhere(CompanyJobRate, { jobTypeId: jobType.id });
  await hardDestroy(jobType);
  res.json({ success: true, message: 'Job type deleted' });
};
