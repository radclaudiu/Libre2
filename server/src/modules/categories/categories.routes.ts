import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { authMiddleware } from '../../middleware/auth';
import { NotFoundError, ValidationError } from '../../utils/errors';

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  order: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export async function categoriesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/api/categories', async (request) => {
    const companyId = request.user!.companyId;
    return prisma.category.findMany({
      where: { companyId },
      orderBy: { order: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  });

  fastify.post('/api/categories', async (request, reply) => {
    const parsed = categorySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const companyId = request.user!.companyId;
    const category = await prisma.category.create({
      data: { ...parsed.data, companyId },
    });

    reply.status(201).send(category);
  });

  fastify.put('/api/categories/:id', async (request) => {
    const { id } = request.params as { id: string };
    const parsed = categorySchema.partial().safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const companyId = request.user!.companyId;
    const existing = await prisma.category.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundError('Category');

    return prisma.category.update({
      where: { id },
      data: parsed.data,
    });
  });

  fastify.delete('/api/categories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const companyId = request.user!.companyId;

    const existing = await prisma.category.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundError('Category');

    await prisma.category.delete({ where: { id } });
    reply.status(204).send();
  });
}
