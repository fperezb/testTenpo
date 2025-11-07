import crypto from 'node:crypto';
import express from 'express';
import {requireAuth} from './auth.js';
import {logger} from './logger.js';
import {getCustomerByRut, insertCustomerEvent, upsertCustomer} from './db.js';
import {isRutValid, normalizeRut} from './utils.js';

export const router = express.Router();

router.get('/customers/:rut', requireAuth, async (req, res, next) => {
  const {rut} = req.params;
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  if (!isRutValid(rut)) {
    logger.warn({requestId, rut}, 'Invalid RUT format');
    return res.status(400).json({message: 'Invalid RUT'});
  }
  const normalizedRut = normalizeRut(rut);
  logger.info({requestId, normalizedRut, user: req.auth?.sub}, 'Fetching customer');
  try {
    const customer = await getCustomerByRut(normalizedRut);
    if (!customer) {
      logger.info({requestId, normalizedRut}, 'Customer not found');
      return res.status(404).json({message: 'Customer not found'});
    }
    logger.info({requestId, normalizedRut}, 'Customer data retrieved');
    return res.json({
      rut: normalizedRut,
      firstName: customer.first_name,
      lastName: customer.last_name
    });
  } catch (err) {
    logger.error({requestId, error: err}, 'Failed to fetch customer');
    return next(err);
  }
});

router.post('/customers', requireAuth, async (req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  const {rut, firstName, lastName, payload = {}} = req.body ?? {};

  if (!rut || !isRutValid(rut)) {
    logger.warn({requestId, rut}, 'Invalid RUT payload');
    return res.status(400).json({message: 'Invalid RUT'});
  }

  if (!firstName || !lastName) {
    logger.warn({requestId, rut}, 'Missing customer name fields');
    return res.status(422).json({message: 'firstName and lastName are required'});
  }

  const normalizedRut = normalizeRut(rut);

  try {
    logger.info({requestId, normalizedRut}, 'Persisting customer payload');
    const persisted = await upsertCustomer({
      rut: normalizedRut,
      firstName,
      lastName
    });

    await insertCustomerEvent({
      rut: normalizedRut,
      payload: {firstName, lastName, payload},
      requestId
    });

    logger.info({requestId, normalizedRut}, 'Customer payload stored');
    return res.status(201).json({
      message: 'Customer stored',
      customer: {
        rut: normalizedRut,
        firstName: persisted.first_name,
        lastName: persisted.last_name
      }
    });
  } catch (err) {
    logger.error({requestId, err, normalizedRut}, 'Failed to persist customer');
    return next(err);
  }
});
