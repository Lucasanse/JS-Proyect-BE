import { PrismaClient } from '@prisma/client';

// Una sola instancia de Prisma para toda la app.
// Los services la importan asi: import { prisma } from '../lib/prisma';
export const prisma = new PrismaClient();
