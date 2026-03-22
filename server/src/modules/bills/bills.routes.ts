import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../utils/prisma';
import { authMiddleware } from '../../middleware/auth';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { getIO } from '../websocket/socket';

const openBillSchema = z.object({
  tableId: z.string().uuid('Invalid table ID'),
});

export async function billsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  fastify.post('/api/bills/open', async (request, reply) => {
    const parsed = openBillSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const companyId = request.user!.companyId;
    const { tableId } = parsed.data;

    const table = await prisma.table.findFirst({
      where: { id: tableId, companyId },
    });
    if (!table) throw new NotFoundError('Table');

    // Check if there's already an open bill
    const existingBill = await prisma.bill.findFirst({
      where: { tableId, companyId, status: 'OPEN' },
    });
    if (existingBill) {
      return reply.send(existingBill);
    }

    const bill = await prisma.bill.create({
      data: { tableId, companyId, status: 'OPEN' },
    });

    reply.status(201).send(bill);
  });

  fastify.get('/api/bills', async (request) => {
    const companyId = request.user!.companyId;
    const { tableId, status } = request.query as { tableId?: string; status?: string };

    const validStatuses = ['OPEN', 'CLOSED'];
    const where: Record<string, unknown> = { companyId };
    if (tableId) where.tableId = tableId;
    if (status && validStatuses.includes(status)) where.status = status;

    return prisma.bill.findMany({
      where,
      include: {
        orders: true,
        table: { select: { id: true, name: true } },
      },
      orderBy: { openedAt: 'desc' },
    });
  });

  fastify.put('/api/bills/:id/close', async (request) => {
    const { id } = request.params as { id: string };
    const companyId = request.user!.companyId;

    const bill = await prisma.bill.findFirst({
      where: { id, companyId, status: 'OPEN' },
      include: { orders: true },
    });
    if (!bill) throw new NotFoundError('Bill');

    // Calculate total from all non-cancelled orders
    let total = new Decimal(0);
    for (const order of bill.orders) {
      if (order.status === 'CANCELLED') continue;
      const items = order.items as Array<{
        quantity: number;
        price: number;
        extras: Array<{ price: number }>;
      }>;
      for (const item of items) {
        const itemTotal = item.price * item.quantity;
        const extrasTotal = (item.extras || []).reduce(
          (sum, e) => sum + e.price * item.quantity,
          0
        );
        total = total.add(new Decimal(itemTotal + extrasTotal));
      }
    }

    const closedBill = await prisma.bill.update({
      where: { id },
      data: {
        status: 'CLOSED',
        total,
        closedAt: new Date(),
      },
      include: {
        orders: true,
        table: { select: { id: true, name: true } },
      },
    });

    // Set table status to FREE
    await prisma.table.update({
      where: { id: bill.tableId },
      data: { status: 'FREE' },
    });

    try {
      const io = getIO();
      io.to(`company_${companyId}`).emit('table_status_changed', {
        tableId: bill.tableId,
        status: 'FREE',
      });
    } catch {
      // Socket not initialized
    }

    return closedBill;
  });
}
