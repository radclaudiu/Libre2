import { FastifyInstance } from 'fastify';
import { prisma } from '../../utils/prisma';
import { NotFoundError } from '../../utils/errors';

export async function menuRoutes(fastify: FastifyInstance) {
  // PUBLIC - no auth required
  fastify.get('/api/menu/:companySlug', async (request) => {
    const { companySlug } = request.params as { companySlug: string };

    const company = await prisma.company.findUnique({
      where: { slug: companySlug },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
      },
    });
    if (!company) throw new NotFoundError('Restaurant');

    const categories = await prisma.category.findMany({
      where: { companyId: company.id, active: true },
      orderBy: { order: 'asc' },
      include: {
        products: {
          where: { active: true },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            image: true,
            extras: true,
          },
        },
      },
    });

    return { company, categories };
  });

  // Get table info (public)
  fastify.get('/api/tables/:id/info', async (request) => {
    const { id } = request.params as { id: string };

    const table = await prisma.table.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        companyId: true,
        company: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!table) throw new NotFoundError('Table');

    return table;
  });
}
