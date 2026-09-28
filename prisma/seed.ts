import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

// Atributos tecnicos por tipo de componente: [nombre, unidad]
const atributosPorTipo: Record<string, [string, string | null][]> = {
  CPU: [['Socket', null], ['Nucleos', null], ['Frecuencia', 'GHz']],
  GPU: [['Memoria', 'GB'], ['Tipo de memoria', null]],
  RAM: [['Capacidad', 'GB'], ['Tipo', null], ['Frecuencia', 'MHz']],
  Motherboard: [['Socket', null], ['Tipo de RAM', null], ['Formato', null]],
  Fuente: [['Potencia', 'W'], ['Certificacion', null]],
  Almacenamiento: [['Capacidad', 'GB'], ['Tipo', null]],
};

// Productos que son componentes de PC: tipo, watts y valores de sus atributos
const componentes = [
  { categoria: 'Procesadores', tipo: 'CPU', watts: 65, nombre: 'Ryzen 5 7600', marca: 'AMD', precio: 320000, stock: 10,
    descripcion: 'Procesador de 6 nucleos para gaming y uso general.',
    valores: { Socket: 'AM5', Nucleos: '6', Frecuencia: '3.8' } },
  { categoria: 'Procesadores', tipo: 'CPU', watts: 125, nombre: 'Core i7-14700K', marca: 'Intel', precio: 650000, stock: 6,
    descripcion: 'Procesador de 20 nucleos de alto rendimiento.',
    valores: { Socket: 'LGA1700', Nucleos: '20', Frecuencia: '3.4' } },
  { categoria: 'Placas de Video', tipo: 'GPU', watts: 115, nombre: 'GeForce RTX 4060', marca: 'ASUS', precio: 550000, stock: 12,
    descripcion: 'Placa de video ideal para jugar en 1080p.',
    valores: { Memoria: '8', 'Tipo de memoria': 'GDDR6' } },
  { categoria: 'Placas de Video', tipo: 'GPU', watts: 200, nombre: 'GeForce RTX 4070', marca: 'MSI', precio: 780000, stock: 8,
    descripcion: 'Placa de video para jugar en 1440p con ray tracing.',
    valores: { Memoria: '12', 'Tipo de memoria': 'GDDR6X' } },
  { categoria: 'Placas de Video', tipo: 'GPU', watts: 165, nombre: 'Radeon RX 7600', marca: 'Sapphire', precio: 480000, stock: 10,
    descripcion: 'Placa de video AMD para 1080p.',
    valores: { Memoria: '8', 'Tipo de memoria': 'GDDR6' } },
  { categoria: 'Memorias RAM', tipo: 'RAM', watts: 5, nombre: 'Fury Beast 16GB DDR5', marca: 'Kingston', precio: 70000, stock: 25,
    descripcion: 'Modulo de memoria DDR5 de 16GB.',
    valores: { Capacidad: '16', Tipo: 'DDR5', Frecuencia: '5600' } },
  { categoria: 'Memorias RAM', tipo: 'RAM', watts: 5, nombre: 'Vengeance 16GB DDR4', marca: 'Corsair', precio: 50000, stock: 30,
    descripcion: 'Modulo de memoria DDR4 de 16GB.',
    valores: { Capacidad: '16', Tipo: 'DDR4', Frecuencia: '3200' } },
  { categoria: 'Motherboards', tipo: 'Motherboard', watts: 50, nombre: 'B650M Gaming', marca: 'Gigabyte', precio: 230000, stock: 9,
    descripcion: 'Motherboard micro ATX para procesadores AM5.',
    valores: { Socket: 'AM5', 'Tipo de RAM': 'DDR5', Formato: 'mATX' } },
  { categoria: 'Motherboards', tipo: 'Motherboard', watts: 60, nombre: 'Z790 Tomahawk', marca: 'MSI', precio: 420000, stock: 5,
    descripcion: 'Motherboard ATX para procesadores Intel LGA1700.',
    valores: { Socket: 'LGA1700', 'Tipo de RAM': 'DDR5', Formato: 'ATX' } },
  { categoria: 'Fuentes', tipo: 'Fuente', watts: 0, nombre: 'RM750e', marca: 'Corsair', precio: 150000, stock: 12,
    descripcion: 'Fuente modular de 750W.',
    valores: { Potencia: '750', Certificacion: '80 Plus Gold' } },
  { categoria: 'Almacenamiento', tipo: 'Almacenamiento', watts: 7, nombre: 'SSD 990 EVO 1TB', marca: 'Samsung', precio: 110000, stock: 20,
    descripcion: 'Disco solido NVMe de 1TB.',
    valores: { Capacidad: '1000', Tipo: 'NVMe' } },
];

// Productos que no son componentes (no tienen ComponentePC)
const otrosProductos = [
  { categoria: 'Perifericos', nombre: 'Mouse Gamer G203', marca: 'Logitech', precio: 25000, stock: 30, descripcion: 'Mouse gamer con iluminacion RGB.' },
  { categoria: 'Perifericos', nombre: 'Teclado Mecanico K95', marca: 'Corsair', precio: 120000, stock: 18, descripcion: 'Teclado mecanico con teclas macro.' },
  { categoria: 'Perifericos', nombre: 'Auriculares HyperX Cloud II', marca: 'HyperX', precio: 95000, stock: 20, descripcion: 'Auriculares gamer con sonido envolvente 7.1.' },
  { categoria: 'Perifericos', nombre: 'Monitor 24" 144Hz', marca: 'Samsung', precio: 320000, stock: 11, descripcion: 'Monitor de 24 pulgadas a 144Hz.' },
  { categoria: 'Notebooks', nombre: 'Notebook Gamer G15', marca: 'Dell', precio: 1650000, stock: 7, descripcion: 'Notebook gamer con RTX 4050.' },
  { categoria: 'Notebooks', nombre: 'Notebook Ideapad 3', marca: 'Lenovo', precio: 950000, stock: 10, descripcion: 'Notebook para estudio y oficina.' },
  { categoria: 'Notebooks', nombre: 'MacBook Air M2', marca: 'Apple', precio: 2400000, stock: 5, descripcion: 'Notebook liviana con chip Apple M2.' },
];

// Traducciones al ingles de algunos productos (por nombre)
const traduccionesEn: Record<string, [string, string]> = {
  'Ryzen 5 7600': ['Ryzen 5 7600', '6-core processor for gaming and everyday use.'],
  'GeForce RTX 4060': ['GeForce RTX 4060', 'Graphics card ideal for 1080p gaming.'],
  'Fury Beast 16GB DDR5': ['Fury Beast 16GB DDR5', '16GB DDR5 memory module.'],
  'Mouse Gamer G203': ['G203 Gaming Mouse', 'Gaming mouse with RGB lighting.'],
  'Notebook Ideapad 3': ['Ideapad 3 Laptop', 'Laptop for study and office work.'],
};

const tiposNotificacion = [
  { codigo: 'VENTA_CONFIRMADA', plantillaMensaje: 'Tu compra #{idVenta} fue confirmada.' },
  { codigo: 'VENTA_ENVIADA', plantillaMensaje: 'Tu compra #{idVenta} fue enviada.' },
  { codigo: 'SOLICITUD_RECIBIDA', plantillaMensaje: 'Recibimos tu solicitud de servicio #{idSolicitud}.' },
  { codigo: 'SOLICITUD_DIAGNOSTICADA', plantillaMensaje: 'Tu solicitud #{idSolicitud} ya tiene diagnostico.' },
];

async function main() {
  if ((await prisma.producto.count()) > 0) {
    console.log('La base ya tiene datos, no se vuelve a sembrar.');
    return;
  }

  // Idiomas
  const espanol = await prisma.idioma.create({ data: { codigo: 'es', nombre: 'Espanol' } });
  const ingles = await prisma.idioma.create({ data: { codigo: 'en', nombre: 'English' } });

  // Categorias (solo organizan el catalogo)
  const nombresCategoria = [...new Set([...componentes, ...otrosProductos].map((p) => p.categoria))];
  const categorias: Record<string, number> = {};
  for (const nombre of nombresCategoria) {
    const c = await prisma.categoria.create({ data: { nombre } });
    categorias[nombre] = c.idCategoria;
  }

  // Tipos de componente con sus atributos tecnicos
  const tipos: Record<string, number> = {};
  const atributos: Record<string, Record<string, number>> = {};
  for (const [nombre, lista] of Object.entries(atributosPorTipo)) {
    const tipo = await prisma.tipoComponente.create({
      data: { nombre, atributos: { create: lista.map(([n, unidad]) => ({ nombre: n, unidad })) } },
      include: { atributos: true },
    });
    tipos[nombre] = tipo.idTipoComponente;
    atributos[nombre] = Object.fromEntries(tipo.atributos.map((a) => [a.nombre, a.idAtributo]));
  }

  // Componentes: Producto + ComponentePC + ValorAtributo
  const idsPorNombre: Record<string, number> = {};
  for (const c of componentes) {
    const producto = await prisma.producto.create({
      data: {
        nombre: c.nombre,
        descripcion: c.descripcion,
        marca: c.marca,
        precio: c.precio,
        stock: c.stock,
        idCategoria: categorias[c.categoria],
        componentePC: {
          create: {
            idTipoComponente: tipos[c.tipo],
            wattsRequeridos: c.watts,
            valoresAtributo: {
              create: Object.entries(c.valores).map(([atributo, valor]) => ({
                idAtributo: atributos[c.tipo][atributo],
                valor,
              })),
            },
          },
        },
      },
    });
    idsPorNombre[c.nombre] = producto.idProducto;
  }

  // Productos que no son componentes
  for (const p of otrosProductos) {
    const producto = await prisma.producto.create({
      data: {
        nombre: p.nombre,
        descripcion: p.descripcion,
        marca: p.marca,
        precio: p.precio,
        stock: p.stock,
        idCategoria: categorias[p.categoria],
      },
    });
    idsPorNombre[p.nombre] = producto.idProducto;
  }

  // Traducciones al ingles
  await prisma.traduccionProducto.createMany({
    data: Object.entries(traduccionesEn).map(([nombre, [nombreTraducido, descripcionTraducida]]) => ({
      idProducto: idsPorNombre[nombre],
      idIdioma: ingles.idIdioma,
      nombreTraducido,
      descripcionTraducida,
    })),
  });

  // Tipos de notificacion
  await prisma.tipoNotificacion.createMany({ data: tiposNotificacion });

  // Usuarios
  const admin = await prisma.usuario.create({
    data: {
      nombreCompleto: 'Administrador',
      correo: 'admin@ecommerce.com',
      passwordHash: await bcrypt.hash('Admin123!', 10),
      rol: 'ADMIN',
      idIdioma: espanol.idIdioma,
      cargo: 'Administrador general',
    },
  });

  const cliente = await prisma.usuario.create({
    data: {
      nombreCompleto: 'Cliente de Prueba',
      correo: 'cliente@ecommerce.com',
      passwordHash: await bcrypt.hash('Cliente123!', 10),
      rol: 'CLIENTE',
      idIdioma: espanol.idIdioma,
      direccion: 'Calle Falsa 123',
      telefono: '2995551234',
    },
  });

  // Un preset de ejemplo para el cliente (2 modulos de RAM iguales)
  const piezas = [
    { nombre: 'Ryzen 5 7600', cantidad: 1 },
    { nombre: 'B650M Gaming', cantidad: 1 },
    { nombre: 'Fury Beast 16GB DDR5', cantidad: 2 },
    { nombre: 'GeForce RTX 4060', cantidad: 1 },
    { nombre: 'SSD 990 EVO 1TB', cantidad: 1 },
  ];
  const potenciaWatts = piezas.reduce(
    (total, p) => total + componentes.find((c) => c.nombre === p.nombre)!.watts * p.cantidad,
    0,
  );
  await prisma.preset.create({
    data: {
      idUsuario: cliente.idUsuario,
      nombre: 'PC Gamer AM5',
      potenciaWatts,
      componentes: {
        create: piezas.map((p) => ({ idProducto: idsPorNombre[p.nombre], cantidad: p.cantidad })),
      },
    },
  });

  console.log(`${componentes.length + otrosProductos.length} productos creados (${componentes.length} componentes de PC).`);
  console.log(`Admin   -> ${admin.correo} / Admin123!`);
  console.log(`Cliente -> ${cliente.correo} / Cliente123!`);
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
