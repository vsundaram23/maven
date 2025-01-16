// const request = require('supertest');
// const express = require('express');
// const authRoutes = require('../routes/auth');

// const app = express();
// app.use(express.json());
// app.use('/api/auth', authRoutes);

// describe('Auth Routes', () => {
//   test('POST /api/auth/check-email - existing email should pass', async () => {
//     const response = await request(app)
//       .post('/api/auth/check-email')
//       .send({ email: 'venkat.sundaram27@gmail.com' })
//       .expect('Content-Type', /json/)
//       .expect(200);
    
//     expect(response.body).toEqual({
//       exists: true,
//       message: 'Email exists in database'
//     });
//   });

//   test('POST /api/auth/check-email - non-existing email should pass', async () => {
//     const response = await request(app)
//       .post('/api/auth/check-email')
//       .send({ email: 'monkey_cow@gmail.com' })
//       .expect('Content-Type', /json/)
//       .expect(200);
    
//     expect(response.body).toEqual({
//       exists: false,
//       message: 'Email not found in database'
//     });
//   });

//   // test('POST /api/auth/check-email - missing email should fail', async () => {
//   //   const response = await request(app)
//   //     .post('/api/auth/check-email')
//   //     .send({})
//   //     .expect('Content-Type', /json/)
//   //     .expect(400);
    
//   //   expect(response.body).toEqual({
//   //     error: 'Email is required'
//   //   });
//   // });
// });
