import { PrismaClient } from '@prisma/client';

// Una sola instancia de Prisma para toda la app.
// Los controllers la importan asi: import { prisma } from '../utils/prisma';
export const prisma = new PrismaClient();
