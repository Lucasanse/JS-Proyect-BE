import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const espanol = await prisma.idioma.upsert({
    where: { idIdioma: 1 },
    update: {},
    create: { codigo: 'es', nombre: 'Espanol' },
  });

  await prisma.idioma.upsert({
    where: { idIdioma: 2 },
    update: {},
    create: { codigo: 'en', nombre: 'English' },
  });

  const categorias = await Promise.all([
    prisma.categoria.upsert({
      where: { idCategoria: 1 },
      update: {},
      create: { idCategoria: 1, nombre: 'Placas de Video', tipo: 'HARDWARE' },
    }),
    prisma.categoria.upsert({
      where: { idCategoria: 2 },
      update: {},
      create: { idCategoria: 2, nombre: 'Perifericos', tipo: 'ACCESORIO' },
    }),
    prisma.categoria.upsert({
      where: { idCategoria: 3 },
      update: {},
      create: { idCategoria: 3, nombre: 'Notebooks', tipo: 'EQUIPO' },
    }),
  ]);
  const [placasDeVideo, perifericos, notebooks] = categorias;

  const productos = [
    // Placas de Video
    { nombre: 'GeForce RTX 4060', marca: 'ASUS', precio: 550000, stock: 12, idCategoria: placasDeVideo.idCategoria },
    { nombre: 'GeForce RTX 4070', marca: 'MSI', precio: 780000, stock: 8, idCategoria: placasDeVideo.idCategoria },
    { nombre: 'Radeon RX 7600', marca: 'Sapphire', precio: 480000, stock: 10, idCategoria: placasDeVideo.idCategoria },
    { nombre: 'Radeon RX 7800 XT', marca: 'PowerColor', precio: 890000, stock: 5, idCategoria: placasDeVideo.idCategoria },
    { nombre: 'GeForce RTX 4090', marca: 'Gigabyte', precio: 2200000, stock: 3, idCategoria: placasDeVideo.idCategoria },
    { nombre: 'GeForce GTX 1650', marca: 'Zotac', precio: 250000, stock: 15, idCategoria: placasDeVideo.idCategoria },
    { nombre: 'Radeon RX 6600', marca: 'ASRock', precio: 380000, stock: 9, idCategoria: placasDeVideo.idCategoria },

    // Perifericos
    { nombre: 'Mouse Gamer G203', marca: 'Logitech', precio: 25000, stock: 30, idCategoria: perifericos.idCategoria },
    { nombre: 'Teclado Mecanico K95', marca: 'Corsair', precio: 120000, stock: 18, idCategoria: perifericos.idCategoria },
    { nombre: 'Auriculares HyperX Cloud II', marca: 'HyperX', precio: 95000, stock: 20, idCategoria: perifericos.idCategoria },
    { nombre: 'Monitor 24" 144Hz', marca: 'Samsung', precio: 320000, stock: 11, idCategoria: perifericos.idCategoria },
    { nombre: 'Webcam C920', marca: 'Logitech', precio: 85000, stock: 14, idCategoria: perifericos.idCategoria },
    { nombre: 'Mousepad XXL', marca: 'SteelSeries', precio: 18000, stock: 40, idCategoria: perifericos.idCategoria },
    { nombre: 'Silla Gamer', marca: 'DXRacer', precio: 450000, stock: 6, idCategoria: perifericos.idCategoria },

    // Notebooks
    { nombre: 'Notebook Gamer G15', marca: 'Dell', precio: 1650000, stock: 7, idCategoria: notebooks.idCategoria },
    { nombre: 'Notebook Ideapad 3', marca: 'Lenovo', precio: 950000, stock: 10, idCategoria: notebooks.idCategoria },
    { nombre: 'Notebook ROG Strix', marca: 'ASUS', precio: 2100000, stock: 4, idCategoria: notebooks.idCategoria },
    { nombre: 'MacBook Air M2', marca: 'Apple', precio: 2400000, stock: 5, idCategoria: notebooks.idCategoria },
    { nombre: 'Notebook Pavilion 15', marca: 'HP', precio: 1100000, stock: 9, idCategoria: notebooks.idCategoria },
    { nombre: 'Notebook Nitro 5', marca: 'Acer', precio: 1350000, stock: 8, idCategoria: notebooks.idCategoria },
  ];

  const cantidadProductos = await prisma.producto.count();
  if (cantidadProductos === 0) {
    await prisma.producto.createMany({ data: productos });
    console.log(`${productos.length} productos creados en 3 categorias distintas.`);
  } else {
    console.log('Ya existen productos cargados, no se vuelve a sembrar el catalogo.');
  }

  const correoAdmin = 'admin@ecommerce.com';
  const existente = await prisma.usuario.findUnique({ where: { correo: correoAdmin } });

  if (!existente) {
    const passwordHash = await bcrypt.hash('Admin123!', 10);
    await prisma.usuario.create({
      data: {
        nombreCompleto: 'Administrador',
        correo: correoAdmin,
        passwordHash,
        rol: 'ADMIN',
        idIdioma: espanol.idIdioma,
        cargo: 'Administrador general',
      },
    });
    console.log(`Usuario admin creado -> correo: ${correoAdmin} / password: Admin123!`);
  } else {
    console.log('El usuario admin ya existe, no se vuelve a crear.');
  }

  console.log('Seed finalizado correctamente.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
