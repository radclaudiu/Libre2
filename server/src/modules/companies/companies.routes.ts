import { FastifyInstance } from 'fastify';
import { prisma } from '../../utils/prisma';
import { authMiddleware } from '../../middleware/auth';

export async function companiesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/api/company', async (request) => {
    const companyId = request.user!.companyId;
    return prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, slug: true, logo: true, createdAt: true },
    });
  });
}
