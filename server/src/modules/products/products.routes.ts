import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { prisma } from '../../utils/prisma';
import { authMiddleware } from '../../middleware/auth';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { config } from '../../utils/config';
import { v4 as uuidv4 } from 'uuid';

const extraSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
});

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().max(1000).optional(),
  price: z.number().min(0, 'Price must be positive'),
  categoryId: z.string().uuid('Invalid category ID'),
  active: z.boolean().optional(),
  extras: z.array(extraSchema).optional(),
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function productsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/api/products', async (request) => {
    const companyId = request.user!.companyId;
    const { categoryId } = request.query as { categoryId?: string };

    const where: Record<string, unknown> = { companyId };
    if (categoryId) where.categoryId = categoryId;

    return prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  });

  fastify.post('/api/products', async (request, reply) => {
    const parsed = productSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const companyId = request.user!.companyId;

    const category = await prisma.category.findFirst({
      where: { id: parsed.data.categoryId, companyId },
    });
    if (!category) throw new NotFoundError('Category');

    const product = await prisma.product.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        price: parsed.data.price,
        categoryId: parsed.data.categoryId,
        active: parsed.data.active ?? true,
        extras: parsed.data.extras ?? [],
        companyId,
      },
    });

    reply.status(201).send(product);
  });

  fastify.put('/api/products/:id', async (request) => {
    const { id } = request.params as { id: string };
    const parsed = productSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const companyId = request.user!.companyId;
    const existing = await prisma.product.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundError('Product');

    if (parsed.data.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: parsed.data.categoryId, companyId },
      });
      if (!category) throw new NotFoundError('Category');
    }

    return prisma.product.update({
      where: { id },
      data: parsed.data,
    });
  });

  fastify.delete('/api/products/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const companyId = request.user!.companyId;

    const existing = await prisma.product.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundError('Product');

    await prisma.product.delete({ where: { id } });
    reply.status(204).send();
  });

  fastify.post('/api/products/:id/image', async (request, reply) => {
    const { id } = request.params as { id: string };
    const companyId = request.user!.companyId;

    const existing = await prisma.product.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundError('Product');

    const data = await request.file();
    if (!data) throw new ValidationError('No file uploaded');

    if (!ALLOWED_MIME_TYPES.includes(data.mimetype)) {
      throw new ValidationError('Only JPEG, PNG, and WebP images are allowed');
    }

    const chunks: Buffer[] = [];
    let totalSize = 0;
    for await (const chunk of data.file) {
      totalSize += chunk.length;
      if (totalSize > MAX_FILE_SIZE) {
        throw new ValidationError('File size exceeds 5MB limit');
      }
      chunks.push(chunk);
    }

    if (data.file.truncated) {
      throw new ValidationError('File size exceeds limit');
    }

    const buffer = Buffer.concat(chunks);

    // Validate file content matches declared MIME type via magic bytes
    const magicBytes = buffer.subarray(0, 4);
    const isJPEG = magicBytes[0] === 0xFF && magicBytes[1] === 0xD8;
    const isPNG = magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4E && magicBytes[3] === 0x47;
    const isWEBP = buffer.length > 12 && buffer.subarray(8, 12).toString() === 'WEBP';
    if (!isJPEG && !isPNG && !isWEBP) {
      throw new ValidationError('File content does not match a valid image format');
    }

    // Force extension based on actual content, not user-provided filename
    const ext = isJPEG ? '.jpg' : isPNG ? '.png' : '.webp';
    const filename = `${uuidv4()}${ext}`;
    const uploadDir = path.resolve(config.UPLOAD_DIR);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, filename), buffer);

    // Delete old image if exists - verify path stays within upload directory
    if (existing.image) {
      const oldFilename = path.basename(existing.image);
      const oldPath = path.join(uploadDir, oldFilename);
      const resolvedOldPath = path.resolve(oldPath);
      if (resolvedOldPath.startsWith(path.resolve(uploadDir))) {
        await fs.unlink(resolvedOldPath).catch(() => {});
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: { image: `/uploads/${filename}` },
    });

    reply.send(product);
  });
}
