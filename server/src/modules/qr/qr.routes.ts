import { FastifyInstance } from 'fastify';
import QRCode from 'qrcode';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { authMiddleware } from '../../middleware/auth';
import { NotFoundError, ValidationError } from '../../utils/errors';

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

function validateDomain(domain: string): string {
  try {
    const url = new URL(domain);
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      throw new ValidationError('Only HTTP and HTTPS protocols are allowed');
    }
    return url.origin;
  } catch (e) {
    if (e instanceof ValidationError) throw e;
    throw new ValidationError('Invalid domain URL');
  }
}

export async function qrRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  fastify.post('/api/tables/:id/qr', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { domain } = request.query as { domain?: string };
    const companyId = request.user!.companyId;

    const table = await prisma.table.findFirst({
      where: { id, companyId },
      include: { company: { select: { slug: true } } },
    });
    if (!table) throw new NotFoundError('Table');

    const defaultUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const baseUrl = domain ? validateDomain(domain) : defaultUrl;
    const menuUrl = `${baseUrl}/m/${encodeURIComponent(table.company.slug)}/${encodeURIComponent(table.id)}`;

    const qrDataUrl = await QRCode.toDataURL(menuUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    });

    await prisma.table.update({
      where: { id },
      data: { qrCode: menuUrl },
    });

    reply.send({
      url: menuUrl,
      qrImage: qrDataUrl,
      tableId: table.id,
      tableName: table.name,
    });
  });
}
