import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { authMiddleware } from '../../middleware/auth';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';
import { getIO, emitSessionEvent } from '../websocket/socket';
import { Decimal } from '@prisma/client/runtime/library';

const openSessionSchema = z.object({
  tableId: z.string().uuid('Invalid table ID'),
});

export async function sessionsRoutes(fastify: FastifyInstance) {
  // OPEN SESSION - requires auth (TPV only)
  fastify.post('/api/sessions/open', { preHandler: authMiddleware }, async (request, reply) => {
    const parsed = openSessionSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const companyId = request.user!.companyId;
    const { tableId } = parsed.data;

    // Verify table belongs to company
    const table = await prisma.table.findFirst({
      where: { id: tableId, companyId },
    });
    if (!table) throw new NotFoundError('Table');

    // Check if there's already an active session
    const existingSession = await prisma.tableSession.findFirst({
      where: { tableId, companyId, status: 'ACTIVE' },
    });
    if (existingSession) {
      throw new ValidationError('This table already has an active session');
    }

    // Create session + bill + mark table occupied in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.tableSession.create({
        data: {
          tableId,
          companyId,
          status: 'ACTIVE',
        },
      });

      const bill = await tx.bill.create({
        data: {
          tableId,
          companyId,
          sessionId: session.id,
          status: 'OPEN',
        },
      });

      await tx.table.update({
        where: { id: tableId },
        data: { status: 'OCCUPIED' },
      });

      return { session, bill };
    });

    // Emit events to company room and table room
    try {
      emitSessionEvent('session_opened', companyId, tableId, {
        sessionId: result.session.id,
        sessionToken: result.session.sessionToken,
        tableId,
        tableName: table.name,
      });
      emitSessionEvent('table_status_changed', companyId, tableId, {
        tableId,
        status: 'OCCUPIED',
      });
    } catch {
      // Socket not initialized
    }

    reply.status(201).send({
      session: result.session,
      bill: result.bill,
    });
  });

  // CHECK SESSION - PUBLIC (client scans QR)
  fastify.get('/api/sessions/check/:tableId', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request) => {
    const { tableId } = request.params as { tableId: string };

    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: {
        company: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!table) throw new NotFoundError('Table');

    const activeSession = await prisma.tableSession.findFirst({
      where: { tableId, status: 'ACTIVE' },
    });

    if (!activeSession) {
      return {
        active: false,
        table: { id: table.id, name: table.name },
        company: table.company,
      };
    }

    return {
      active: true,
      sessionToken: activeSession.sessionToken,
      sessionId: activeSession.id,
      table: { id: table.id, name: table.name },
      company: table.company,
    };
  });

  // CLOSE SESSION - requires auth (TPV only)
  fastify.put('/api/sessions/close/:sessionId', { preHandler: authMiddleware }, async (request) => {
    const { sessionId } = request.params as { sessionId: string };
    const companyId = request.user!.companyId;

    const session = await prisma.tableSession.findFirst({
      where: { id: sessionId, companyId, status: 'ACTIVE' },
      include: {
        table: { select: { id: true, name: true } },
        bill: { include: { orders: true } },
      },
    });
    if (!session) throw new NotFoundError('Active session');

    // Calculate bill total from non-cancelled orders
    let total = new Decimal(0);
    if (session.bill) {
      for (const order of session.bill.orders) {
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
    }

    // Close everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Close session
      const closedSession = await tx.tableSession.update({
        where: { id: sessionId },
        data: { status: 'CLOSED', closedAt: new Date() },
      });

      // Close bill
      let closedBill = null;
      if (session.bill) {
        closedBill = await tx.bill.update({
          where: { id: session.bill.id },
          data: { status: 'CLOSED', total, closedAt: new Date() },
          include: { orders: true, table: { select: { id: true, name: true } } },
        });
      }

      // Set table to FREE
      await tx.table.update({
        where: { id: session.tableId },
        data: { status: 'FREE' },
      });

      return { closedSession, closedBill };
    });

    // Emit events to company room AND table room (so public clients get notified)
    try {
      emitSessionEvent('session_closed', companyId, session.tableId, {
        sessionId,
        tableId: session.tableId,
        sessionToken: session.sessionToken,
      });
      emitSessionEvent('table_status_changed', companyId, session.tableId, {
        tableId: session.tableId,
        status: 'FREE',
      });
    } catch {
      // Socket not initialized
    }

    return {
      session: result.closedSession,
      bill: result.closedBill,
      total: Number(total),
    };
  });

  // LIST ACTIVE SESSIONS - requires auth
  fastify.get('/api/sessions/active', { preHandler: authMiddleware }, async (request) => {
    const companyId = request.user!.companyId;

    return prisma.tableSession.findMany({
      where: { companyId, status: 'ACTIVE' },
      include: {
        table: { select: { id: true, name: true } },
        orders: {
          select: { id: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { openedAt: 'desc' },
    });
  });
}
