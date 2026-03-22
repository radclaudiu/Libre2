import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { authMiddleware } from '../../middleware/auth';
import { NotFoundError, ValidationError } from '../../utils/errors';

const tableSchema = z.object({
  name: z.string().min(1, 'Table name is required').max(50),
  posX: z.number().min(0).optional(),
  posY: z.number().min(0).optional(),
  width: z.number().min(20).max(500).optional(),
  height: z.number().min(20).max(500).optional(),
});

const positionSchema = z.object({
  posX: z.number().min(0),
  posY: z.number().min(0),
  width: z.number().min(20).max(500).optional(),
  height: z.number().min(20).max(500).optional(),
});

export async function tablesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/api/tables', async (request) => {
    const companyId = request.user!.companyId;
    return prisma.table.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  });

  fastify.post('/api/tables', async (request, reply) => {
    const parsed = tableSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const companyId = request.user!.companyId;
    const table = await prisma.table.create({
      data: { ...parsed.data, companyId },
    });

    reply.status(201).send(table);
  });

  fastify.put('/api/tables/:id', async (request) => {
    const { id } = request.params as { id: string };
    const parsed = tableSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const companyId = request.user!.companyId;
    const existing = await prisma.table.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundError('Table');

    return prisma.table.update({
      where: { id },
      data: parsed.data,
    });
  });

  fastify.put('/api/tables/:id/position', async (request) => {
    const { id } = request.params as { id: string };
    const parsed = positionSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const companyId = request.user!.companyId;
    const existing = await prisma.table.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundError('Table');

    return prisma.table.update({
      where: { id },
      data: parsed.data,
    });
  });

  fastify.delete('/api/tables/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const companyId = request.user!.companyId;

    const existing = await prisma.table.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundError('Table');

    await prisma.table.delete({ where: { id } });
    reply.status(204).send();
  });
}
