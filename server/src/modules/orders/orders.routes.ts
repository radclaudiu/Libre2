import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { authMiddleware } from '../../middleware/auth';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';
import { getIO } from '../websocket/socket';

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(99),
  price: z.number().min(0).max(99999),
  extras: z.array(z.object({
    name: z.string().min(1).max(100),
    price: z.number().min(0).max(9999),
  })).max(20).optional().default([]),
});

const createOrderSchema = z.object({
  tableId: z.string().uuid('Invalid table ID'),
  sessionToken: z.string().uuid('Invalid session token'),
  items: z.array(orderItemSchema).min(1, 'At least one item is required').max(50, 'Too many items in one order'),
  notes: z.string().max(500).optional(),
});

const statusSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'SERVED', 'CANCELLED']),
});

export async function ordersRoutes(fastify: FastifyInstance) {
  // PUBLIC endpoint - requires valid sessionToken
  fastify.post('/api/orders', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const parsed = createOrderSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const { tableId, sessionToken, items, notes } = parsed.data;

    // Validate session is ACTIVE for this table
    const session = await prisma.tableSession.findFirst({
      where: {
        sessionToken,
        tableId,
        status: 'ACTIVE',
      },
      include: {
        table: { select: { name: true } },
        bill: true,
      },
    });

    if (!session) {
      throw new ForbiddenError('No active session for this table. Ask the waiter to open your table.');
    }

    const companyId = session.companyId;

    // Verify all products exist and belong to company, and validate prices
    const productIds = items.map(i => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, companyId, active: true },
    });

    if (products.length !== new Set(productIds).size) {
      throw new ValidationError('One or more products are invalid or inactive');
    }

    // Validate prices server-side to prevent tampering
    const productMap = new Map(products.map(p => [p.id, p]));
    const validatedItems = items.map(item => {
      const product = productMap.get(item.productId);
      if (!product) throw new ValidationError(`Product ${item.productId} not found`);

      const serverExtras = (product.extras as Array<{ name: string; price: number }>) || [];
      const validatedExtras = item.extras.map(extra => {
        const serverExtra = serverExtras.find(se => se.name === extra.name);
        if (!serverExtra) {
          throw new ValidationError(`Extra "${extra.name}" is not valid for product "${product.name}"`);
        }
        return { name: serverExtra.name, price: serverExtra.price };
      });

      return {
        productId: item.productId,
        name: product.name,
        quantity: item.quantity,
        price: Number(product.price),
        extras: validatedExtras,
      };
    });

    // Create order linked to session
    const order = await prisma.order.create({
      data: {
        tableId,
        companyId,
        sessionId: session.id,
        billId: session.bill?.id,
        items: validatedItems,
        notes,
        status: 'PENDING',
      },
      include: { table: { select: { id: true, name: true } } },
    });

    // Emit to TPV via WebSocket
    try {
      const io = getIO();
      io.to(`company_${companyId}`).emit('new_order', {
        ...order,
        items: validatedItems,
      });
    } catch {
      // Socket not initialized yet, skip
    }

    reply.status(201).send(order);
  });

  // Protected endpoints
  const validStatuses = ['PENDING', 'ACCEPTED', 'SERVED', 'CANCELLED'];

  fastify.get('/api/orders', { preHandler: authMiddleware }, async (request) => {
    const companyId = request.user!.companyId;
    const { tableId, sessionId, status } = request.query as {
      tableId?: string;
      sessionId?: string;
      status?: string;
    };

    const where: Record<string, unknown> = { companyId };
    if (tableId) where.tableId = tableId;
    if (sessionId) where.sessionId = sessionId;
    if (status && validStatuses.includes(status)) where.status = status;

    return prisma.order.findMany({
      where,
      include: { table: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  });

  fastify.put('/api/orders/:id/status', { preHandler: authMiddleware }, async (request) => {
    const { id } = request.params as { id: string };
    const parsed = statusSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const companyId = request.user!.companyId;
    const existing = await prisma.order.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundError('Order');

    const order = await prisma.order.update({
      where: { id },
      data: { status: parsed.data.status },
      include: { table: { select: { id: true, name: true } } },
    });

    try {
      const io = getIO();
      io.to(`company_${companyId}`).emit('order_status_changed', order);
    } catch {
      // Socket not initialized
    }

    return order;
  });
}
