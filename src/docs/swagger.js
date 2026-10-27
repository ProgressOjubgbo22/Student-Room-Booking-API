import swaggerJsdoc from 'swagger-jsdoc';
import env from '../config/env.js';

// ---------- reusable pieces ----------
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema, example) => ({ 'application/json': { schema, ...(example && { example }) } });
const body = (schema, example) => ({ required: true, content: json(schema, example) });
const secured = [{ bearerAuth: [] }];

const err = (description, message, errors) => ({
  description,
  content: json(ref('Error'), { success: false, message, ...(errors && { errors }) }),
});
const E400 = err('Validation failed / invalid ID format', 'Validation failed', [
  { field: 'id', message: 'Invalid ID format' },
]);
const E401 = err('Missing, invalid or expired access token', 'Authentication required');
const E403 = err('Authenticated but not allowed', 'You do not have permission to perform this action');
const E404 = (what) => err(`${what} not found`, `${what} not found`);
const E409 = (msg) => err('Conflict', msg);

const idParam = (name = 'id', description = 'MongoDB ObjectId') => ({
  name, in: 'path', required: true, description,
  schema: { type: 'string', pattern: '^[a-f0-9]{24}$' }, example: '665f1c2e8a1b2c3d4e5f6a7b',
});
const queryParam = (name, schema, description, example) => ({ name, in: 'query', required: false, description, schema, example });
const pageParams = [
  queryParam('page', { type: 'integer', minimum: 1, default: 1 }, 'Page number', 1),
  queryParam('limit', { type: 'integer', minimum: 1, maximum: 100, default: 10 }, 'Items per page', 10),
];

// ---------- examples ----------
const roomExample = {
  roomId: '665f1c2e8a1b2c3d4e5f6a7b', roomNumber: 'A101', building: 'Block A', capacity: 4,
  occupied: 1, availableSpaces: 3, isAvailable: true,
  createdAt: '2026-10-24T09:00:00.000Z', updatedAt: '2026-10-24T09:00:00.000Z',
};
const studentExample = {
  studentId: '665f1c2e8a1b2c3d4e5f6a01', matricNumber: 'CSC/2021/001', firstName: 'Ada', lastName: 'Obi',
  email: 'ada@school.edu', role: 'student', createdAt: '2026-10-24T09:00:00.000Z', updatedAt: '2026-10-24T09:00:00.000Z',
};
const bookingExample = {
  bookingId: '665f1c2e8a1b2c3d4e5f6a99', studentId: studentExample.studentId, roomId: roomExample.roomId,
  bookingDate: '2026-10-24T10:00:00.000Z', status: 'pending', isPaid: false, paymentDate: null,
  checkInAt: null, cancelledAt: null, expiredAt: null, expiresAt: '2026-10-31T10:00:00.000Z',
  createdAt: '2026-10-24T10:00:00.000Z', updatedAt: '2026-10-24T10:00:00.000Z',
  room: roomExample, student: studentExample,
};
const paginationExample = { page: 1, limit: 10, total: 1, totalPages: 1 };
const wrap = (data, message) => ({ success: true, ...(message && { message }), data });
const okRes = (description, schema, example) => ({ description, content: json(schema, example) });

// ---------- schemas ----------
const schemas = {
  Error: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string' },
      errors: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } },
    },
  },
  Pagination: {
    type: 'object',
    properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, totalPages: { type: 'integer' } },
  },
  Student: {
    type: 'object',
    properties: {
      studentId: { type: 'string' }, matricNumber: { type: 'string' }, firstName: { type: 'string' },
      lastName: { type: 'string' }, email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['student', 'admin'] },
      createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  Room: {
    type: 'object',
    properties: {
      roomId: { type: 'string' }, roomNumber: { type: 'string' }, building: { type: 'string' },
      capacity: { type: 'integer', minimum: 1, maximum: 4, default: 4 },
      occupied: { type: 'integer' }, availableSpaces: { type: 'integer' }, isAvailable: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  Booking: {
    type: 'object',
    properties: {
      bookingId: { type: 'string' }, studentId: { type: 'string' }, roomId: { type: 'string' },
      bookingDate: { type: 'string', format: 'date-time' },
      status: { type: 'string', enum: ['pending', 'confirmed', 'checked_in', 'cancelled', 'expired'] },
      isPaid: { type: 'boolean', default: false },
      paymentDate: { type: 'string', format: 'date-time', nullable: true },
      checkInAt: { type: 'string', format: 'date-time', nullable: true },
      cancelledAt: { type: 'string', format: 'date-time', nullable: true },
      expiredAt: { type: 'string', format: 'date-time', nullable: true },
      expiresAt: { type: 'string', format: 'date-time', nullable: true, description: 'Deadline for unpaid bookings (bookingDate + 7 days). Null once paid, cancelled or expired.' },
      room: ref('Room'), student: { ...ref('Student'), description: 'Included for admins only' },
      createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  RegisterRequest: {
    type: 'object', required: ['matricNumber', 'firstName', 'lastName', 'email', 'password'],
    properties: {
      matricNumber: { type: 'string' }, firstName: { type: 'string' }, lastName: { type: 'string' },
      email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 },
    },
  },
  LoginRequest: {
    type: 'object', required: ['matricNumber', 'password'],
    properties: { matricNumber: { type: 'string' }, password: { type: 'string' } },
  },
  CreateRoomRequest: {
    type: 'object', required: ['roomNumber', 'building'],
    properties: {
      roomNumber: { type: 'string' }, building: { type: 'string' },
      capacity: { type: 'integer', minimum: 1, maximum: 4, default: 4 },
    },
  },
  UpdateRoomRequest: {
    type: 'object', minProperties: 1,
    properties: {
      roomNumber: { type: 'string' }, building: { type: 'string' },
      capacity: { type: 'integer', minimum: 1, maximum: 4, description: 'Cannot be lower than current active bookings' },
    },
  },
  CreateBookingRequest: {
    type: 'object', required: ['roomId'], properties: { roomId: { type: 'string' } },
  },
  PaymentRequest: {
    type: 'object',
    properties: {
      paymentIntentId: {
        type: 'string',
        description: 'Stripe PaymentIntent id (pi_...). Required for students. The PaymentIntent must be succeeded and have metadata.bookingId equal to this booking id. Admins may omit it (manual confirmation).',
      },
    },
  },
};

const bookingResponse = (description, message) =>
  okRes(description, { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: ref('Booking') } }, wrap(bookingExample, message));

// ---------- paths ----------
const paths = {
  '/api/v1/auth/register': {
    post: {
      tags: ['Auth'], summary: 'Register a student account',
      requestBody: body(ref('RegisterRequest'), { matricNumber: 'CSC/2021/001', firstName: 'Ada', lastName: 'Obi', email: 'ada@school.edu', password: 'Password123' }),
      responses: {
        201: okRes('Student registered', { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: ref('Student') } }, wrap(studentExample, 'Registration successful')),
        400: E400, 409: E409('Matric number or email already registered'),
      },
    },
  },
  '/api/v1/auth/login': {
    post: {
      tags: ['Auth'], summary: 'Log in (students and admin) and get an access token',
      description: 'Copy `accessToken` and click **Authorize** in Swagger UI to call protected endpoints. A seeded admin account is created on startup (see `.env`).',
      requestBody: body(ref('LoginRequest'), { matricNumber: 'ADMIN001', password: 'Admin12345' }),
      responses: {
        200: okRes('Login successful', { type: 'object' }, wrap({ accessToken: 'eyJhbGciOi...', tokenType: 'Bearer', expiresIn: '1d', user: studentExample })),
        400: E400, 401: err('Wrong credentials', 'Invalid matric number or password'),
      },
    },
  },

  '/api/v1/rooms': {
    post: {
      tags: ['Rooms'], summary: 'Create a room (admin)', security: secured,
      requestBody: body(ref('CreateRoomRequest'), { roomNumber: 'A101', building: 'Block A', capacity: 4 }),
      responses: {
        201: okRes('Room created', { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: ref('Room') } }, wrap(roomExample, 'Room created')),
        400: E400, 401: E401, 403: E403, 409: E409('Room A101 already exists'),
      },
    },
    get: {
      tags: ['Rooms'], summary: 'List rooms and availability',
      parameters: [...pageParams, queryParam('building', { type: 'string' }, 'Filter by building', 'Block A')],
      responses: {
        200: okRes('Rooms (empty array when none exist)', { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: ref('Room') }, pagination: ref('Pagination') } }, { success: true, data: [roomExample], pagination: paginationExample }),
        400: E400,
      },
    },
  },
  '/api/v1/rooms/{id}': {
    get: {
      tags: ['Rooms'], summary: 'Get a room and its assigned students', parameters: [idParam()],
      responses: {
        200: okRes('Room details', { type: 'object' }, wrap({
          ...roomExample,
          assignedStudents: [{ bookingId: bookingExample.bookingId, status: 'pending', isPaid: false, student: studentExample }],
        })),
        400: E400, 404: E404('Room'),
      },
    },
    patch: {
      tags: ['Rooms'], summary: 'Update room details (admin)', security: secured, parameters: [idParam()],
      description: 'Capacity may not exceed 4 and may not be reduced below the room\'s current active bookings. `roomId`, `createdAt` etc. cannot be changed (400).',
      requestBody: body(ref('UpdateRoomRequest'), { building: 'Block B', capacity: 3 }),
      responses: {
        200: okRes('Room updated', { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: ref('Room') } }, wrap({ ...roomExample, building: 'Block B', capacity: 3 }, 'Room updated')),
        400: E400, 401: E401, 403: E403, 404: E404('Room'),
        409: E409('Room number taken, or capacity lower than current active bookings'),
      },
    },
  },

  '/api/v1/bookings': {
    post: {
      tags: ['Bookings'], summary: 'Create a booking for the logged-in student', security: secured,
      description: 'Creates a `pending`, unpaid booking that expires 7 days after creation unless paid.',
      requestBody: body(ref('CreateBookingRequest'), { roomId: roomExample.roomId }),
      responses: {
        201: bookingResponse('Booking created', 'Booking created'),
        400: E400, 401: E401, 403: E403, 404: E404('Room'),
        409: E409('Room is full / Student already has an active booking'),
      },
    },
    get: {
      tags: ['Bookings'], summary: 'List bookings (admin: all, student: own)', security: secured,
      parameters: [
        ...pageParams,
        queryParam('status', { type: 'string', enum: ['pending', 'confirmed', 'checked_in', 'cancelled', 'expired'] }, 'Filter by status', 'pending'),
        queryParam('isPaid', { type: 'boolean' }, 'Filter by payment status', false),
        queryParam('roomId', { type: 'string' }, 'Filter by room'),
        queryParam('studentId', { type: 'string' }, 'Filter by student (admin only)'),
      ],
      responses: {
        200: okRes('Bookings (empty array when none match)', { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: ref('Booking') }, pagination: ref('Pagination') } }, { success: true, data: [bookingExample], pagination: paginationExample }),
        400: E400, 401: E401,
      },
    },
  },
  '/api/v1/bookings/{id}': {
    get: {
      tags: ['Bookings'], summary: 'Get a booking by ID', security: secured, parameters: [idParam()],
      description: 'Students can only see their own bookings (others return 404).',
      responses: { 200: bookingResponse('Booking details'), 400: E400, 401: E401, 404: E404('Booking') },
    },
    delete: {
      tags: ['Bookings'], summary: 'Cancel a booking and release the room space', security: secured, parameters: [idParam()],
      description: 'The record is kept for auditing with status `cancelled`. Checked-in bookings cannot be cancelled.',
      responses: {
        200: bookingResponse('Booking cancelled', 'Booking cancelled and room space released'),
        400: E400, 401: E401, 404: E404('Booking'),
        409: E409('Booking is already cancelled / expired / checked in'),
      },
    },
  },
  '/api/v1/bookings/{id}/check-in': {
    patch: {
      tags: ['Bookings'], summary: 'Check a student in', security: secured, parameters: [idParam()],
      description: 'Allowed for the booking owner or an admin. The booking must be paid (`confirmed`).',
      responses: {
        200: bookingResponse('Checked in', 'Check-in successful'),
        400: E400, 401: E401, 404: E404('Booking'),
        409: E409('Payment is outstanding / booking expired, cancelled or already checked in'),
      },
    },
  },
  '/api/v1/bookings/{id}/payment': {
    patch: {
      tags: ['Payments'], summary: 'Mark a booking as paid', security: secured, parameters: [idParam()],
      description: 'Students must send a Stripe `paymentIntentId` which the API verifies with Stripe. Admins may confirm manually without it. Calling it again on a paid booking returns 200 with the existing payment (idempotent).',
      requestBody: { required: false, content: json(ref('PaymentRequest'), { paymentIntentId: 'pi_3Pxxxxxxxxxxxx' }) },
      responses: {
        200: bookingResponse('Payment recorded (or already paid)', 'Payment recorded'),
        400: E400, 401: E401, 404: E404('Booking'),
        409: E409('Booking expired / cancelled, or payment not successful'),
        503: err('Stripe is not configured', 'Payment provider is not configured'),
      },
    },
  },
  '/api/v1/students/{matricNumber}/booking': {
    get: {
      tags: ['Bookings'], summary: "Get a student's active booking", security: secured,
      description: 'Students may only query their own matric number; admins can query anyone.',
      parameters: [idParam('matricNumber', 'Student matriculation number (URL-encode "/" as %2F)')].map((p) => ({ ...p, schema: { type: 'string' }, example: 'CSC%2F2021%2F001' })),
      responses: {
        200: bookingResponse('Active booking'),
        400: E400, 401: E401, 403: E403, 404: E404('Student or active booking'),
      },
    },
  },
};

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Student Room Booking API',
      version: '1.0.0',
      description:
        'Room booking, check-in and payment API. Each room holds up to 4 students. Unpaid bookings expire automatically after 7 days.\n\n' +
        '**Authentication:** call `POST /api/v1/auth/login`, copy the `accessToken`, click **Authorize** and paste it (no "Bearer " prefix needed).',
    },
    servers: [{ url: `http://localhost:${env.port}`, description: 'Local development' }],
    tags: [{ name: 'Auth' }, { name: 'Rooms' }, { name: 'Bookings' }, { name: 'Payments' }],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      schemas,
    },
    paths,
  },
  apis: [],
});

export default swaggerSpec;
