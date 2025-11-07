import {afterEach, describe, expect, it, jest} from '@jest/globals';
import request from 'supertest';

jest.unstable_mockModule('../src/db.js', () => ({
  getCustomerByRut: jest.fn(),
  insertCustomerEvent: jest.fn(),
  upsertCustomer: jest.fn()
}));

jest.unstable_mockModule('../src/auth.js', () => ({
  requireAuth: (_req, _res, next) => next()
}));

const {getCustomerByRut, insertCustomerEvent, upsertCustomer} = await import('../src/db.js');
const {default: app} = await import('../src/server.js');

describe('GET /customers/:rut', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for invalid rut', async () => {
    const res = await request(app).get('/customers/invalid');
    expect(res.status).toBe(400);
  });

  it('returns customer when found', async () => {
    getCustomerByRut.mockResolvedValue({first_name: 'Juan', last_name: 'Pérez'});
    const res = await request(app).get('/customers/12345678-5');
    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('Juan');
  });

  it('returns 404 when not found', async () => {
    getCustomerByRut.mockResolvedValue(null);
    const res = await request(app).get('/customers/12345678-5');
    expect(res.status).toBe(404);
  });
});

describe('POST /customers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid rut payload', async () => {
    const res = await request(app)
      .post('/customers')
      .send({rut: 'invalid', firstName: 'Ana', lastName: 'Diaz'});
    expect(res.status).toBe(400);
    expect(insertCustomerEvent).not.toHaveBeenCalled();
  });

  it('rejects missing name fields', async () => {
    const res = await request(app)
      .post('/customers')
      .send({rut: '12345678-5', firstName: 'Ana'});
    expect(res.status).toBe(422);
    expect(insertCustomerEvent).not.toHaveBeenCalled();
  });

  it('stores the customer payload', async () => {
    insertCustomerEvent.mockResolvedValue({id: 1});
    upsertCustomer.mockResolvedValue({first_name: 'Ana', last_name: 'Diaz'});

    const payload = {rut: '12345678-5', firstName: 'Ana', lastName: 'Diaz', payload: {source: 'web'}};
    const res = await request(app).post('/customers').send(payload);

    expect(res.status).toBe(201);
    expect(insertCustomerEvent).toHaveBeenCalledWith(
      expect.objectContaining({rut: '12345678-5'})
    );
    expect(upsertCustomer).toHaveBeenCalledWith(
      expect.objectContaining({firstName: 'Ana', lastName: 'Diaz'})
    );
    expect(res.body.customer.firstName).toBe('Ana');
  });

  it('propagates persistence errors', async () => {
    insertCustomerEvent.mockResolvedValue({id: 1});
    upsertCustomer.mockRejectedValue(new Error('db down'));

    const res = await request(app)
      .post('/customers')
      .send({rut: '12345678-5', firstName: 'Ana', lastName: 'Diaz'});

    expect(res.status).toBe(500);
  });
});
