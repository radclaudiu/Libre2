import { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError } from '../utils/errors';

export async function tenantMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  if (!request.user) {
    throw new ForbiddenError('Authentication required');
  }

  const { companyId } = request.user;
  const bodyCompanyId = (request.body as Record<string, unknown>)?.companyId;
  const queryCompanyId = (request.query as Record<string, unknown>)?.companyId;

  if (bodyCompanyId && bodyCompanyId !== companyId) {
    throw new ForbiddenError('Access denied to this company resource');
  }

  if (queryCompanyId && queryCompanyId !== companyId) {
    throw new ForbiddenError('Access denied to this company resource');
  }
}
