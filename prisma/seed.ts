import 'dotenv/config';
import { prisma } from '../src/utils/prisma';
import bcrypt from 'bcryptjs';

// ─── Datos del catalogo ───────────────────────────────────────────────
// Todo se declara "as const" + "satisfies": asi TypeScript conoce los nombres
// exactos y marca como error un typo en una categoria, un atributo tecnico
// o el nombre de un producto (por ejemplo, en las piezas del preset).

const CATEGORIAS = [
  'Computadoras',
  'Notebooks',
  'Procesadores',
  'Placas de Video',
  'Memorias RAM',
  'Motherboards',
  'Fuentes',
  'Almacenamiento',
  'Perifericos',
  'Insumos',
] as const;
type NombreCategoria = (typeof CATEGORIAS)[number];

// Atributos tecnicos por tipo de componente: [nombre, unidad]
const atributosPorTipo = {
  CPU: [['Socket', null], ['Nucleos', null], ['Frecuencia', 'GHz']],
  GPU: [['Memoria', 'GB'], ['Tipo de memoria', null]],
  RAM: [['Capacidad', 'GB'], ['Tipo', null], ['Frecuencia', 'MHz']],
  Motherboard: [['Socket', null], ['Tipo de RAM', null], ['Formato', null]],
  Fuente: [['Potencia', 'W'], ['Certificacion', null]],
  Almacenamiento: [['Capacidad', 'GB'], ['Tipo', null]],
} as const satisfies Record<string, readonly (readonly [string, string | null])[]>;

type TipoComponente = keyof typeof atributosPorTipo;
type AtributoDe<T extends TipoComponente> = (typeof atributosPorTipo)[T][number][0];

interface ProductoSeed {
  categoria: NombreCategoria;
  nombre: string;
  marca: string;
  precio: number;
  stock: number;
  descripcion: string;
}

// Union por tipo: un CPU solo acepta atributos de CPU, y tiene que tenerlos todos.
type ComponenteSeed = {
  [T in TipoComponente]: ProductoSeed & { tipo: T; watts: number; valores: Record<AtributoDe<T>, string> };
}[TipoComponente];

// Productos que son componentes de PC: tipo, watts y valores de sus atributos
const componentes = [
  { categoria: 'Procesadores', tipo: 'CPU', watts: 65, nombre: 'Ryzen 5 7600', marca: 'AMD', precio: 320000, stock: 10,
    descripcion: 'Procesador de 6 nucleos para gaming y uso general.',
    valores: { Socket: 'AM5', Nucleos: '6', Frecuencia: '3.8' } },
  // Sin stock: sirve para probar las validaciones del carrito
  { categoria: 'Procesadores', tipo: 'CPU', watts: 125, nombre: 'Core i7-14700K', marca: 'Intel', precio: 650000, stock: 0,
    descripcion: 'Procesador de 20 nucleos de alto rendimiento.',
    valores: { Socket: 'LGA1700', Nucleos: '20', Frecuencia: '3.4' } },
  { categoria: 'Procesadores', tipo: 'CPU', watts: 65, nombre: 'Core i5-14400F', marca: 'Intel', precio: 290000, stock: 14,
    descripcion: 'Procesador de 10 nucleos sin graficos integrados.',
    valores: { Socket: 'LGA1700', Nucleos: '10', Frecuencia: '2.5' } },
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
  { categoria: 'Fuentes', tipo: 'Fuente', watts: 0, nombre: 'MWE 550 Bronze', marca: 'Cooler Master', precio: 75000, stock: 16,
    descripcion: 'Fuente de 550W para equipos de gama media.',
    valores: { Potencia: '550', Certificacion: '80 Plus Bronze' } },
  { categoria: 'Almacenamiento', tipo: 'Almacenamiento', watts: 7, nombre: 'SSD 990 EVO 1TB', marca: 'Samsung', precio: 110000, stock: 20,
    descripcion: 'Disco solido NVMe de 1TB.',
    valores: { Capacidad: '1000', Tipo: 'NVMe' } },
  { categoria: 'Almacenamiento', tipo: 'Almacenamiento', watts: 6, nombre: 'Barracuda 2TB', marca: 'Seagate', precio: 85000, stock: 13,
    descripcion: 'Disco rigido de 2TB para almacenamiento masivo.',
    valores: { Capacidad: '2000', Tipo: 'HDD' } },
] as const satisfies readonly ComponenteSeed[];

// Productos que no son componentes (no tienen ComponentePC)
const otrosProductos = [
  // Computadoras
  { categoria: 'Computadoras', nombre: 'PC Gamer Ryzen 5 RTX 4060', marca: 'HP', precio: 1450000, stock: 4,
    descripcion: 'PC de escritorio armada con Ryzen 5, 16GB RAM y RTX 4060.' },
  { categoria: 'Computadoras', nombre: 'PC Oficina Core i3', marca: 'Lenovo', precio: 620000, stock: 9,
    descripcion: 'PC de escritorio para tareas de oficina, 8GB RAM y SSD 256GB.' },
  { categoria: 'Computadoras', nombre: 'Mac mini M2', marca: 'Apple', precio: 1300000, stock: 0,
    descripcion: 'Computadora compacta con chip Apple M2.' },
  { categoria: 'Notebooks', nombre: 'Notebook Gamer G15', marca: 'Dell', precio: 1650000, stock: 7,
    descripcion: 'Notebook gamer con RTX 4050.' },
  { categoria: 'Notebooks', nombre: 'Notebook Ideapad 3', marca: 'Lenovo', precio: 950000, stock: 10,
    descripcion: 'Notebook para estudio y oficina.' },
  { categoria: 'Notebooks', nombre: 'MacBook Air M2', marca: 'Apple', precio: 2400000, stock: 5,
    descripcion: 'Notebook liviana con chip Apple M2.' },
  // Perifericos
  { categoria: 'Perifericos', nombre: 'Mouse Gamer G203', marca: 'Logitech', precio: 25000, stock: 30,
    descripcion: 'Mouse gamer con iluminacion RGB.' },
  { categoria: 'Perifericos', nombre: 'Mouse MX Master 3S', marca: 'Logitech', precio: 140000, stock: 0,
    descripcion: 'Mouse inalambrico ergonomico para productividad.' },
  { categoria: 'Perifericos', nombre: 'Teclado Mecanico K95', marca: 'Corsair', precio: 120000, stock: 18,
    descripcion: 'Teclado mecanico con teclas macro.' },
  { categoria: 'Perifericos', nombre: 'Auriculares HyperX Cloud II', marca: 'HyperX', precio: 95000, stock: 20,
    descripcion: 'Auriculares gamer con sonido envolvente 7.1.' },
  { categoria: 'Perifericos', nombre: 'Monitor 24" 144Hz', marca: 'Samsung', precio: 320000, stock: 11,
    descripcion: 'Monitor de 24 pulgadas a 144Hz.' },
  { categoria: 'Perifericos', nombre: 'Webcam C920', marca: 'Logitech', precio: 80000, stock: 15,
    descripcion: 'Camara web Full HD para videollamadas.' },
  // Insumos
  { categoria: 'Insumos', nombre: 'Pasta Termica MX-4 4g', marca: 'Arctic', precio: 9000, stock: 50,
    descripcion: 'Pasta termica de alto rendimiento para procesadores.' },
  { categoria: 'Insumos', nombre: 'Cable HDMI 2.1 2m', marca: 'Ugreen', precio: 12000, stock: 40,
    descripcion: 'Cable HDMI 2.1 compatible con 4K a 120Hz.' },
  { categoria: 'Insumos', nombre: 'Cartucho 664 Negro', marca: 'HP', precio: 18000, stock: 35,
    descripcion: 'Cartucho de tinta negra original para impresoras HP.' },
  { categoria: 'Insumos', nombre: 'Toner 85A', marca: 'HP', precio: 65000, stock: 0,
    descripcion: 'Toner original para impresoras laser HP.' },
  { categoria: 'Insumos', nombre: 'Pendrive 64GB', marca: 'Kingston', precio: 8000, stock: 60,
    descripcion: 'Memoria USB 3.2 de 64GB.' },
] as const satisfies readonly ProductoSeed[];

type NombreProducto = (typeof componentes)[number]['nombre'] | (typeof otrosProductos)[number]['nombre'];

// Idiomas del usuario (Usuario.idIdioma es obligatorio). Los productos se cargan
// solo en espanol; las traducciones de producto quedan para mas adelante.
const idiomas = [
  { codigo: 'es', nombre: 'Espanol' },
  { codigo: 'en', nombre: 'English' },
] as const;
type CodigoIdioma = (typeof idiomas)[number]['codigo'];

const tiposNotificacion = [
  { codigo: 'VENTA_CONFIRMADA', plantillaMensaje: 'Tu compra #{idVenta} fue confirmada.' },
  { codigo: 'VENTA_ENVIADA', plantillaMensaje: 'Tu compra #{idVenta} fue enviada.' },
  { codigo: 'SOLICITUD_RECIBIDA', plantillaMensaje: 'Recibimos tu solicitud de servicio #{idSolicitud}.' },
  { codigo: 'SOLICITUD_DIAGNOSTICADA', plantillaMensaje: 'Tu solicitud #{idSolicitud} ya tiene diagnostico.' },
];

// Object.entries pierde el tipo de las claves; este helper lo conserva.
const entries = <T extends object>(obj: T) => Object.entries(obj) as [Extract<keyof T, string>, T[keyof T]][];

async function main() {
  if ((await prisma.producto.count()) > 0) {
    console.log('La base ya tiene datos, no se vuelve a sembrar.');
    return;
  }

  // Idiomas
  const idsIdioma = {} as Record<CodigoIdioma, number>;
  for (const idioma of idiomas) {
    const creado = await prisma.idioma.create({ data: idioma });
    idsIdioma[idioma.codigo] = creado.idIdioma;
  }

  // Categorias (solo organizan el catalogo)
  const categorias = {} as Record<NombreCategoria, number>;
  for (const nombre of CATEGORIAS) {
    const c = await prisma.categoria.create({ data: { nombre } });
    categorias[nombre] = c.idCategoria;
  }

  // Tipos de componente con sus atributos tecnicos
  const tipos = {} as Record<TipoComponente, number>;
  const atributos = {} as Record<TipoComponente, Record<string, number>>;
  for (const [nombre, lista] of entries(atributosPorTipo)) {
    const tipo = await prisma.tipoComponente.create({
      data: { nombre, atributos: { create: lista.map(([n, unidad]) => ({ nombre: n, unidad })) } },
      include: { atributos: true },
    });
    tipos[nombre] = tipo.idTipoComponente;
    atributos[nombre] = Object.fromEntries(tipo.atributos.map((a) => [a.nombre, a.idAtributo]));
  }

  // Componentes: Producto + ComponentePC + ValorAtributo
  const idsPorNombre = {} as Record<NombreProducto, number>;
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

  // Tipos de notificacion
  await prisma.tipoNotificacion.createMany({ data: tiposNotificacion });

  // Usuarios
  const admin = await prisma.usuario.create({
    data: {
      nombreCompleto: 'Administrador',
      correo: 'admin@ecommerce.com',
      passwordHash: await bcrypt.hash('Admin123!', 10),
      rol: 'ADMIN',
      idIdioma: idsIdioma.es,
      cargo: 'Administrador general',
    },
  });

  const cliente = await prisma.usuario.create({
    data: {
      nombreCompleto: 'Cliente de Prueba',
      correo: 'cliente@ecommerce.com',
      passwordHash: await bcrypt.hash('Cliente123!', 10),
      rol: 'CLIENTE',
      idIdioma: idsIdioma.es,
      direccion: 'Calle Falsa 123',
      telefono: '2995551234',
    },
  });

  // Un preset de ejemplo para el cliente (2 modulos de RAM iguales)
  const piezas: { nombre: (typeof componentes)[number]['nombre']; cantidad: number }[] = [
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

  const sinStock = [...componentes, ...otrosProductos].filter((p) => p.stock === 0).map((p) => p.nombre);
  console.log(`${componentes.length + otrosProductos.length} productos creados (${componentes.length} componentes de PC).`);
  console.log(`Sin stock: ${sinStock.join(', ')}`);
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
