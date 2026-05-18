import { Op } from 'sequelize';
import { Driver, DriverDocument, Vehicle } from '../models/index.js';
import { toPublicUploadPath } from '../middlewares/driverUpload.js';
import { formatDriver } from '../utils/driverExpiry.js';

const DOC_TYPE_LABELS = {
  driving_license: 'Driving License',
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

export const listDrivers = async (req, res) => {
  const { status, driverType, search } = req.query;
  const where = {};

  if (status && status !== 'all') where.status = status;
  if (driverType && driverType !== 'all') where.driverType = driverType;
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { mobile: { [Op.like]: `%${search}%` } },
    ];
  }

  const drivers = await Driver.findAll({
    where,
    include: [
      {
        model: Vehicle,
        as: 'defaultVehicle',
        attributes: ['id', 'vehicleNumber'],
      },
    ],
    order: [['name', 'ASC']],
  });

  res.json({
    success: true,
    data: drivers.map(formatDriver),
  });
};

export const createDriver = async (req, res) => {
  if (req.body.defaultVehicleId) {
    const vehicle = await Vehicle.findByPk(req.body.defaultVehicleId);
    if (!vehicle) {
      return res.status(400).json({ success: false, message: 'Invalid default vehicle' });
    }
  }

  const driver = await Driver.create({
    name: req.body.name,
    mobile: req.body.mobile,
    address: req.body.address || null,
    licenseNumber: req.body.licenseNumber,
    licenseExpiry: req.body.licenseExpiry || null,
    driverType: req.body.driverType,
    defaultVehicleId: req.body.defaultVehicleId || null,
    status: req.body.status || 'available',
    notes: req.body.notes || null,
    grossSalary: req.body.grossSalary ?? null,
  });

  const withVehicle = await Driver.findByPk(driver.id, {
    include: [{ model: Vehicle, as: 'defaultVehicle', attributes: ['id', 'vehicleNumber'] }],
  });

  res.status(201).json({ success: true, data: formatDriver(withVehicle) });
};

export const quickAddOutsideDriver = async (req, res) => {
  let defaultVehicleId = null;
  let notes = req.body.notes || '';

  if (req.body.vehicleNumber) {
    const vehicle = await Vehicle.findOne({
      where: { vehicleNumber: req.body.vehicleNumber },
    });
    if (vehicle) {
      defaultVehicleId = vehicle.id;
    } else {
      const vehicleNote = `Vehicle: ${req.body.vehicleNumber}`;
      notes = notes ? `${vehicleNote}\n${notes}` : vehicleNote;
    }
  }

  const driver = await Driver.create({
    name: req.body.name,
    mobile: req.body.mobile,
    address: null,
    licenseNumber: 'PENDING',
    licenseExpiry: null,
    driverType: 'outside',
    defaultVehicleId,
    status: 'available',
    notes: notes || null,
  });

  const withVehicle = await Driver.findByPk(driver.id, {
    include: [{ model: Vehicle, as: 'defaultVehicle', attributes: ['id', 'vehicleNumber'] }],
  });

  res.status(201).json({ success: true, data: formatDriver(withVehicle) });
};

export const getDriver = async (req, res) => {
  const driver = await Driver.findByPk(req.params.id, {
    include: [
      { model: Vehicle, as: 'defaultVehicle', attributes: ['id', 'vehicleNumber'] },
      { model: DriverDocument, as: 'documents' },
    ],
  });

  if (!driver) {
    return res.status(404).json({ success: false, message: 'Driver not found' });
  }

  const plain = formatDriver(driver);
  plain.documents = (plain.documents || []).map(formatDocument);

  res.json({ success: true, data: plain });
};

export const updateDriver = async (req, res) => {
  const driver = await Driver.findByPk(req.params.id);
  if (!driver) {
    return res.status(404).json({ success: false, message: 'Driver not found' });
  }

  if (req.body.defaultVehicleId) {
    const vehicle = await Vehicle.findByPk(req.body.defaultVehicleId);
    if (!vehicle) {
      return res.status(400).json({ success: false, message: 'Invalid default vehicle' });
    }
  }

  const fields = [
    'name',
    'mobile',
    'address',
    'licenseNumber',
    'licenseExpiry',
    'driverType',
    'defaultVehicleId',
    'status',
    'notes',
    'grossSalary',
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      driver[field] = req.body[field] === '' ? null : req.body[field];
    }
  });

  await driver.save();

  const withVehicle = await Driver.findByPk(driver.id, {
    include: [{ model: Vehicle, as: 'defaultVehicle', attributes: ['id', 'vehicleNumber'] }],
  });

  res.json({ success: true, data: formatDriver(withVehicle) });
};

export const deleteDriver = async (req, res) => {
  const driver = await Driver.findByPk(req.params.id);
  if (!driver) {
    return res.status(404).json({ success: false, message: 'Driver not found' });
  }
  await driver.destroy();
  res.json({ success: true, message: 'Driver deleted' });
};

export const uploadDocument = async (req, res) => {
  const driver = await Driver.findByPk(req.params.id);
  if (!driver) {
    return res.status(404).json({ success: false, message: 'Driver not found' });
  }
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const doc = await DriverDocument.create({
    driverId: driver.id,
    docType: req.body.docType,
    filePath: toPublicUploadPath(req.file.path),
    originalName: req.file.originalname,
    uploadedAt: new Date(),
  });

  res.status(201).json({ success: true, data: formatDocument(doc) });
};

export const deleteDocument = async (req, res) => {
  const doc = await DriverDocument.findOne({
    where: { id: req.params.docId, driverId: req.params.id },
  });

  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  await doc.destroy();
  res.json({ success: true, message: 'Document deleted' });
};
