import { FastifyInstance } from 'fastify';
import { prisma } from '../../utils/prisma';
import { authMiddleware } from '../../middleware/auth';

export async function billsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/api/bills', async (request) => {
    const companyId = request.user!.companyId;
    const { tableId, sessionId, status } = request.query as {
      tableId?: string;
      sessionId?: string;
      status?: string;
    };

    const validStatuses = ['OPEN', 'CLOSED'];
    const where: Record<string, unknown> = { companyId };
    if (tableId) where.tableId = tableId;
    if (sessionId) where.sessionId = sessionId;
    if (status && validStatuses.includes(status)) where.status = status;

    return prisma.bill.findMany({
      where,
      include: {
        orders: true,
        table: { select: { id: true, name: true } },
        session: { select: { id: true, openedAt: true, closedAt: true, status: true } },
      },
      orderBy: { openedAt: 'desc' },
    });
  });
}
