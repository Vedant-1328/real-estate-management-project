import { Op } from 'sequelize';
import { Employee, EmployeeAdvance, EmployeeDocument } from '../models/index.js';
import { hardDestroy, hardDestroyWhere } from '../utils/hardDestroy.js';
import { toPublicUploadPath } from '../middlewares/employeeUpload.js';

const DOC_TYPE_LABELS = {
  id_proof: 'ID Proof',
  address_proof: 'Address Proof',
  other: 'Other',
};

const formatDocument = (doc) => {
  const plain = doc.get ? doc.get({ plain: true }) : doc;
  return {
    ...plain,
    docTypeLabel: DOC_TYPE_LABELS[plain.docType] || plain.docType,
    url: plain.filePath,
  };
};

const formatEmployee = (employee) => {
  const plain = employee.get ? employee.get({ plain: true }) : { ...employee };
  if (plain.grossSalary != null) {
    plain.grossSalary = Number(plain.grossSalary);
  }
  return plain;
};

export const listEmployees = async (req, res) => {
  const { status, employeeType, search } = req.query;
  const where = {};

  if (status && status !== 'all') where.status = status;
  if (employeeType && employeeType !== 'all') where.employeeType = employeeType;
  if (search) {
    where.name = { [Op.like]: `%${search}%` };
  }

  const employees = await Employee.findAll({
    where,
    order: [['name', 'ASC']],
  });

  res.json({
    success: true,
    data: employees.map(formatEmployee),
  });
};

export const createEmployee = async (req, res) => {
  const employee = await Employee.create({
    name: req.body.name,
    mobile: req.body.mobile,
    email: req.body.email || null,
    roleDepartment: req.body.roleDepartment,
    joiningDate: req.body.joiningDate,
    grossSalary: req.body.grossSalary,
    employeeType: req.body.employeeType,
    status: req.body.status || 'active',
    notes: req.body.notes || null,
  });

  res.status(201).json({ success: true, data: formatEmployee(employee) });
};

export const getEmployee = async (req, res) => {
  const employee = await Employee.findByPk(req.params.id, {
    include: [{ model: EmployeeDocument, as: 'documents' }],
  });

  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }

  const plain = formatEmployee(employee);
  plain.documents = (plain.documents || []).map(formatDocument);

  res.json({ success: true, data: plain });
};

export const updateEmployee = async (req, res) => {
  const employee = await Employee.findByPk(req.params.id);
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }

  const fields = [
    'name',
    'mobile',
    'email',
    'roleDepartment',
    'joiningDate',
    'grossSalary',
    'employeeType',
    'status',
    'notes',
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      employee[field] = req.body[field] === '' ? null : req.body[field];
    }
  });

  await employee.save();

  res.json({ success: true, data: formatEmployee(employee) });
};

export const deleteEmployee = async (req, res) => {
  const employee = await Employee.findByPk(req.params.id);
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }

  await hardDestroyWhere(EmployeeDocument, { employeeId: employee.id });
  await hardDestroyWhere(EmployeeAdvance, { employeeId: employee.id });
  await hardDestroy(employee);
  res.json({ success: true, message: 'Employee deleted' });
};

export const uploadDocument = async (req, res) => {
  const employee = await Employee.findByPk(req.params.id);
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const doc = await EmployeeDocument.create({
    employeeId: employee.id,
    docType: req.body.docType,
    filePath: toPublicUploadPath(req.file.path),
    originalName: req.file.originalname,
    uploadedAt: new Date(),
  });

  res.status(201).json({ success: true, data: formatDocument(doc) });
};

export const deleteDocument = async (req, res) => {
  const doc = await EmployeeDocument.findOne({
    where: { id: req.params.docId, employeeId: req.params.id },
  });

  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  await hardDestroy(doc);
  res.json({ success: true, message: 'Document deleted' });
};
