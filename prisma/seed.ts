import "dotenv/config";
import type { Prisma } from "@prisma/client";
import { prisma } from "../src/utils/prisma";
import { hashPassword } from "better-auth/crypto";

// ─── Datos del catalogo ───────────────────────────────────────────────
// Todo se declara "as const" + "satisfies": asi TypeScript conoce los nombres
// exactos y marca como error un typo en una categoria, un atributo tecnico
// o el nombre de un producto (por ejemplo, en las piezas del preset).

const CATEGORIAS = [
  "Computadoras",
  "Notebooks",
  "Procesadores",
  "Placas de Video",
  "Memorias RAM",
  "Motherboards",
  "Fuentes",
  "Almacenamiento",
  "Teclados",
  "Mouse",
  "Auriculares",
  "Perifericos",
  "Insumos",
] as const;
type NombreCategoria = (typeof CATEGORIAS)[number];

// Atributos tecnicos por tipo de componente: [nombre, unidad]
const atributosPorTipo = {
  CPU: [
    ["Socket", null],
    ["Nucleos", null],
    ["Frecuencia", "GHz"],
  ],
  GPU: [
    ["Memoria", "GB"],
    ["Tipo de memoria", null],
  ],
  RAM: [
    ["Capacidad", "GB"],
    ["Tipo", null],
    ["Frecuencia", "MHz"],
  ],
  Motherboard: [
    ["Socket", null],
    ["Tipo de RAM", null],
    ["Formato", null],
  ],
  Fuente: [
    ["Potencia", "W"],
    ["Certificacion", null],
  ],
  Almacenamiento: [
    ["Capacidad", "GB"],
    ["Tipo", null],
  ],
} as const satisfies Record<
  string,
  readonly (readonly [string, string | null])[]
>;

type TipoComponente = keyof typeof atributosPorTipo;
type AtributoDe<T extends TipoComponente> =
  (typeof atributosPorTipo)[T][number][0];

interface ProductoSeed {
  categoria: NombreCategoria;
  nombre: string;
  marca: string;
  precio: number;
  stock: number;
  descripcion: string;
  imagenUrl: string;
}

// Union por tipo: un CPU solo acepta atributos de CPU, y tiene que tenerlos todos.
type ComponenteSeed = {
  [T in TipoComponente]: ProductoSeed & {
    tipo: T;
    watts: number;
    valores: Record<AtributoDe<T>, string>;
  };
}[TipoComponente];

// Productos que son componentes de PC: tipo, watts y valores de sus atributos
const componentes = [
  {
    categoria: "Procesadores",
    tipo: "CPU",
    watts: 65,
    nombre: "Ryzen 5 7600",
    marca: "AMD",
    precio: 320000,
    stock: 10,
    descripcion: "Procesador de 6 nucleos para gaming y uso general.",
    imagenUrl:
      "https://www.t1distribution.nl/media/catalog/product/cache/15acba1947954f3fa31ee12bffe5ff16/a/m/amd-ryzen5-7600box-1589.png",
    valores: { Socket: "AM5", Nucleos: "6", Frecuencia: "3.8" },
  },
  // Sin stock: sirve para probar las validaciones del carrito
  {
    categoria: "Procesadores",
    tipo: "CPU",
    watts: 125,
    nombre: "Core i7-14700K",
    marca: "Intel",
    precio: 650000,
    stock: 0,
    descripcion: "Procesador de 20 nucleos de alto rendimiento.",
    imagenUrl:
      "https://media.cdn.kaufland.de/product-images/1024x1024/5d1c1be82b24a451d3aeed1df8eb1f40.jpg",
    valores: { Socket: "LGA1700", Nucleos: "20", Frecuencia: "3.4" },
  },
  {
    categoria: "Procesadores",
    tipo: "CPU",
    watts: 65,
    nombre: "Core i5-14400F",
    marca: "Intel",
    precio: 290000,
    stock: 14,
    descripcion: "Procesador de 10 nucleos sin graficos integrados.",
    imagenUrl: "https://m.media-amazon.com/images/I/61IgclF1FEL.jpg",
    valores: { Socket: "LGA1700", Nucleos: "10", Frecuencia: "2.5" },
  },
  {
    categoria: "Placas de Video",
    tipo: "GPU",
    watts: 115,
    nombre: "GeForce RTX 4060",
    marca: "ASUS",
    precio: 550000,
    stock: 12,
    descripcion: "Placa de video ideal para jugar en 1080p.",
    imagenUrl:
      "https://www.liontech-gaming.com/wp-content/uploads/2025/03/VGA-ASUS-GEFORCE-RTX-4060-DUAL-OC-EDITION-8G.webp",
    valores: { Memoria: "8", "Tipo de memoria": "GDDR6" },
  },
  {
    categoria: "Placas de Video",
    tipo: "GPU",
    watts: 180,
    nombre: "GeForce RTX 5060 Ti 16GB",
    marca: "PNY",
    precio: 690000,
    stock: 12,
    descripcion: "Placa de video ideal para jugar en 1080p y 1440p.",
    imagenUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Nvidia_GeForce_RTX_5060_Ti_16GB%2C_PNY_Overclocked_Dual_Fan%2C_front.jpg/960px-Nvidia_GeForce_RTX_5060_Ti_16GB%2C_PNY_Overclocked_Dual_Fan%2C_front.jpg",
    valores: { Memoria: "16", "Tipo de memoria": "GDDR7" },
  },
  {
    categoria: "Placas de Video",
    tipo: "GPU",
    watts: 200,
    nombre: "GeForce RTX 4070",
    marca: "MSI",
    precio: 780000,
    stock: 8,
    descripcion: "Placa de video para jugar en 1440p con ray tracing.",
    imagenUrl:
      "https://img.terabyteshop.com.br/produto/g/placa-de-video-msi-nvidia-geforce-rtx-4070-ventus-2x-oc-12gb-gddr6-dlss-ray-tracing-912-v513-063_167516.png",
    valores: { Memoria: "12", "Tipo de memoria": "GDDR6X" },
  },
  {
    categoria: "Placas de Video",
    tipo: "GPU",
    watts: 165,
    nombre: "Radeon RX 7600",
    marca: "Sapphire",
    precio: 480000,
    stock: 10,
    descripcion: "Placa de video AMD para 1080p.",
    imagenUrl:
      "https://media.ldlc.com/r1600/ld/products/00/06/03/65/LD0006036585.jpg",
    valores: { Memoria: "8", "Tipo de memoria": "GDDR6" },
  },
  {
    categoria: "Memorias RAM",
    tipo: "RAM",
    watts: 5,
    nombre: "Fury Beast 16GB DDR5",
    marca: "Kingston",
    precio: 70000,
    stock: 25,
    descripcion: "Modulo de memoria DDR5 de 16GB.",
    imagenUrl:
      "https://cyberbull.com.bd/wp-content/uploads/2026/02/kingston-fury-beast-16gb-ddr5-5600mhz-black-2.jpg",
    valores: { Capacidad: "16", Tipo: "DDR5", Frecuencia: "5600" },
  },
  {
    categoria: "Memorias RAM",
    tipo: "RAM",
    watts: 5,
    nombre: "Vengeance 16GB DDR4",
    marca: "Corsair",
    precio: 50000,
    stock: 30,
    descripcion: "Modulo de memoria DDR4 de 16GB.",
    imagenUrl:
      "https://dinobyte.ar/wp-content/uploads/Memoria-Corsair-vengeance-LPX-Black.jpg",
    valores: { Capacidad: "16", Tipo: "DDR4", Frecuencia: "3200" },
  },
  {
    categoria: "Motherboards",
    tipo: "Motherboard",
    watts: 50,
    nombre: "B650M Gaming",
    marca: "Gigabyte",
    precio: 230000,
    stock: 9,
    descripcion: "Motherboard micro ATX para procesadores AM5.",
    imagenUrl:
      "https://media.ldlc.com/r1600/ld/products/00/06/00/57/LD0006005768.jpg",
    valores: { Socket: "AM5", "Tipo de RAM": "DDR5", Formato: "mATX" },
  },
  {
    categoria: "Motherboards",
    tipo: "Motherboard",
    watts: 60,
    nombre: "Z790 Tomahawk",
    marca: "MSI",
    precio: 420000,
    stock: 5,
    descripcion: "Motherboard ATX para procesadores Intel LGA1700.",
    imagenUrl:
      "https://www.picclickimg.com/Tr8AAeSwqBJqtlGs/Msi-MAG-Z790-TOMAHAWK-WIFI-Socket-1700-Z790-Ddr5-S-Ata-6Gb-S-Atx.webp",
    valores: { Socket: "LGA1700", "Tipo de RAM": "DDR5", Formato: "ATX" },
  },
  {
    categoria: "Fuentes",
    tipo: "Fuente",
    watts: 0,
    nombre: "RM750e",
    marca: "Corsair",
    precio: 150000,
    stock: 12,
    descripcion: "Fuente modular de 750W.",
    imagenUrl:
      "https://fullh4rd.com.ar/img/productos/26/fuente-750w-corsair-rm750e-80-plus-gold-bajo-ruido-fully-modular-1.jpg",
    valores: { Potencia: "750", Certificacion: "80 Plus Gold" },
  },
  {
    categoria: "Fuentes",
    tipo: "Fuente",
    watts: 0,
    nombre: "MWE 550 Bronze",
    marca: "Cooler Master",
    precio: 75000,
    stock: 16,
    descripcion: "Fuente de 550W para equipos de gama media.",
    imagenUrl:
      "https://files.coolermaster.com/og-image/mwe-550-bronze-v2-230v-600x600.jpg",
    valores: { Potencia: "550", Certificacion: "80 Plus Bronze" },
  },
  {
    categoria: "Almacenamiento",
    tipo: "Almacenamiento",
    watts: 7,
    nombre: "SSD 990 EVO 1TB",
    marca: "Samsung",
    precio: 110000,
    stock: 20,
    descripcion: "Disco solido NVMe de 1TB.",
    imagenUrl:
      "https://media.ldlc.com/r1600/ld/products/00/06/10/22/LD0006102201.jpg",
    valores: { Capacidad: "1000", Tipo: "NVMe" },
  },
  {
    categoria: "Almacenamiento",
    tipo: "Almacenamiento",
    watts: 6,
    nombre: "Barracuda 2TB",
    marca: "Seagate",
    precio: 85000,
    stock: 13,
    descripcion: "Disco rigido de 2TB para almacenamiento masivo.",
    imagenUrl:
      "https://www.deffo.com.ar/wp-content/uploads/2020/08/ST2000DM008-1.jpg",
    valores: { Capacidad: "2000", Tipo: "HDD" },
  },
] as const satisfies readonly ComponenteSeed[];

// Productos que no son componentes (no tienen ComponentePC)
const otrosProductos = [
  // Computadoras
  {
    categoria: "Computadoras",
    nombre: "PC Gamer Ryzen 5 RTX 4060",
    marca: "HP",
    precio: 1450000,
    stock: 4,
    descripcion: "PC de escritorio armada con Ryzen 5, 16GB RAM y RTX 4060.",
    imagenUrl: "https://rstech.cl/wp-content/uploads/2023/07/PC-4060-MSI.png",
  },
  {
    categoria: "Computadoras",
    nombre: "PC Oficina Core i3",
    marca: "Lenovo",
    precio: 620000,
    stock: 9,
    descripcion:
      "PC de escritorio para tareas de oficina, 8GB RAM y SSD 256GB.",
    imagenUrl:
      "https://i5.walmartimages.com/seo/Restored-Lenovo-ThinkCentre-M720e-SFF-Desktop-Computer-Intel-Hexa-Core-i5-9400-2-9-GHz-8GB-RAM-128GB-SSD-Windows-11-Home-Office-PC-Refurbished_7bfd1801-3387-474d-908c-133649d3ad2f.c4b9037531b2aef760d2dffd4bf0dd6b.jpeg",
  },
  {
    categoria: "Computadoras",
    nombre: "Mac mini M2",
    marca: "Apple",
    precio: 1300000,
    stock: 0,
    descripcion: "Computadora compacta con chip Apple M2.",
    imagenUrl: "https://m.media-amazon.com/images/I/61jup8h--XL._SL1500_.jpg",
  },
  {
    categoria: "Notebooks",
    nombre: "Notebook Gamer G15",
    marca: "Dell",
    precio: 1650000,
    stock: 7,
    descripcion: "Notebook gamer con RTX 4050.",
    imagenUrl:
      "https://os-jo.com/image/cache/catalog/products/laptops/Dell-G15-5530/image-7705-1200x1200.jpeg",
  },
  {
    categoria: "Notebooks",
    nombre: "Notebook Ideapad 3",
    marca: "Lenovo",
    precio: 950000,
    stock: 10,
    descripcion: "Notebook para estudio y oficina.",
    imagenUrl: "https://m.media-amazon.com/images/I/71M7mo+IhAL.jpg",
  },
  {
    categoria: "Notebooks",
    nombre: "MacBook Air M2",
    marca: "Apple",
    precio: 2400000,
    stock: 5,
    descripcion: "Notebook liviana con chip Apple M2.",
    imagenUrl:
      "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6509/6509651cv12d.jpg",
  },
  // Teclados
  {
    categoria: "Teclados",
    nombre: "Teclado Mecanico K95",
    marca: "Corsair",
    precio: 120000,
    stock: 18,
    descripcion: "Teclado mecanico con teclas macro.",
    imagenUrl:
      "https://assets.corsair.com/image/upload/c_pad,q_85,h_1100,w_1100,f_auto/products/Gaming-Keyboards/CH-9127414-NA/Gallery/K95_PLATINUM_RGB_XT_29.webp",
  },
  {
    categoria: "Teclados",
    nombre: "Teclado Gamer BlackWidow",
    marca: "Razer",
    precio: 135000,
    stock: 9,
    descripcion: "Switches mecanicos verdes, tactiles y con clic.",
    imagenUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Razer_BlackWidow_Ultimate_2014_Elite_Mechanical_Gaming_Keyboard.jpg/960px-Razer_BlackWidow_Ultimate_2014_Elite_Mechanical_Gaming_Keyboard.jpg",
  },
  {
    categoria: "Teclados",
    nombre: "Teclado G PRO TKL",
    marca: "Logitech",
    precio: 145000,
    stock: 12,
    descripcion: "Formato tenkeyless pensado para esports.",
    imagenUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Logitech_G_PRO_TKL_gaming_keyboard_-_English_%28United_States%29_layout.jpg/960px-Logitech_G_PRO_TKL_gaming_keyboard_-_English_%28United_States%29_layout.jpg",
  },
  {
    categoria: "Teclados",
    nombre: "Teclado Mecanico K4 Inalambrico",
    marca: "Keychron",
    precio: 110000,
    stock: 6,
    descripcion: "Teclado mecanico 96% con Bluetooth y cable USB-C.",
    imagenUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Keychron_K4_mechanical_keyboard.jpg/960px-Keychron_K4_mechanical_keyboard.jpg",
  },
  {
    categoria: "Teclados",
    nombre: "Teclado MX Keys",
    marca: "Logitech",
    precio: 125000,
    stock: 0,
    descripcion: "Teclado inalambrico retroiluminado para oficina.",
    imagenUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Logitech_MX_Keys_YR0073_Wireless_Keyboard.jpg/960px-Logitech_MX_Keys_YR0073_Wireless_Keyboard.jpg",
  },
  // Mouse
  {
    categoria: "Mouse",
    nombre: "Mouse Gamer G203",
    marca: "Logitech",
    precio: 25000,
    stock: 30,
    descripcion: "Mouse gamer con iluminacion RGB.",
    imagenUrl:
      "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/2bacc661-d4ff-4edb-8e94-5a426afbfa52.jpg",
  },
  {
    categoria: "Mouse",
    nombre: "Mouse DeathAdder Elite",
    marca: "Razer",
    precio: 60000,
    stock: 15,
    descripcion: "Diseno ergonomico y sensor optico de 16000 DPI.",
    imagenUrl:
      "https://assets2.razerzone.com/images/da10m/carousel/razer-death-adder-gallery-01.png",
  },
  {
    categoria: "Mouse",
    nombre: "Mouse Inalambrico G305",
    marca: "Logitech",
    precio: 48000,
    stock: 22,
    descripcion: "Mouse inalambrico Lightspeed liviano y con gran autonomia.",
    imagenUrl:
      "https://resource.logitechg.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/g305/2025-update/g305-lightspeed-mouse-3qtr-high-back-angle-black-gallery-7.png",
  },
  {
    categoria: "Mouse",
    nombre: "Mouse PRO X Superlight 2",
    marca: "Logitech",
    precio: 210000,
    stock: 4,
    descripcion: "Mouse inalambrico ultraliviano de 60 g para esports.",
    imagenUrl:
      "https://resource.logitechg.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/pro-x-superlight-2/new-gallery-assets-2025/pro-x-superlight-2-mice-profile-right-angle-black-gallery-5.png",
  },
  {
    categoria: "Mouse",
    nombre: "Mouse MX Master 3S",
    marca: "Logitech",
    precio: 140000,
    stock: 0,
    descripcion: "Mouse inalambrico ergonomico para productividad.",
    imagenUrl:
      "https://resource.logitech.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/logitech/en/products/mice/mx-master-3s/migration-assets-for-delorean-2025/gallery/mx-master-3s-top-view-graphite.png",
  },
  // Auriculares
  {
    categoria: "Auriculares",
    nombre: "Auriculares HyperX Cloud II",
    marca: "HyperX",
    precio: 95000,
    stock: 20,
    descripcion: "Auriculares gamer con sonido envolvente 7.1.",
    imagenUrl:
      "https://m.media-amazon.com/images/I/61e0+8QzVBL._AC_SL1500_.jpg",
  },
  {
    categoria: "Auriculares",
    nombre: "Auriculares Gamer G35",
    marca: "Logitech",
    precio: 85000,
    stock: 7,
    descripcion: "Headset 7.1 con microfono desmontable y teclas G.",
    imagenUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Logitech_G35_side_view.jpg/960px-Logitech_G35_side_view.jpg",
  },
  {
    categoria: "Auriculares",
    nombre: "Auriculares HD 25",
    marca: "Sennheiser",
    precio: 170000,
    stock: 5,
    descripcion: "Auriculares cerrados de monitoreo, livianos y resistentes.",
    imagenUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Sennheiser_hd-25_headphones.jpg/960px-Sennheiser_hd-25_headphones.jpg",
  },
  {
    categoria: "Auriculares",
    nombre: "Auriculares HD 800 S",
    marca: "Sennheiser",
    precio: 1900000,
    stock: 2,
    descripcion: "Auriculares abiertos de alta fidelidad para audiofilos.",
    imagenUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Sennheiser_HD800S.jpg/960px-Sennheiser_HD800S.jpg",
  },
  // Perifericos
  {
    categoria: "Perifericos",
    nombre: 'Monitor 24" 144Hz',
    marca: "Samsung",
    precio: 320000,
    stock: 11,
    descripcion: "Monitor de 24 pulgadas a 144Hz.",
    imagenUrl:
      "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6463/6463483_sd.jpg",
  },
  {
    categoria: "Perifericos",
    nombre: "Webcam C920",
    marca: "Logitech",
    precio: 80000,
    stock: 15,
    descripcion: "Camara web Full HD para videollamadas.",
    imagenUrl:
      "https://assets.logitech.com/assets/65478/c920-pro-hd-webcam-refresh.png",
  },
  // Insumos
  {
    categoria: "Insumos",
    nombre: "Pasta Termica MX-4 4g",
    marca: "Arctic",
    precio: 9000,
    stock: 50,
    descripcion: "Pasta termica de alto rendimiento para procesadores.",
    imagenUrl:
      "https://optimod.com.ar/wp-content/uploads/2025/10/Pasta-Termica-ARCTIC-MX-4-4g-con-espatula-FONT-WEB.png",
  },
  {
    categoria: "Insumos",
    nombre: "Cable HDMI 2.1 2m",
    marca: "Ugreen",
    precio: 12000,
    stock: 40,
    descripcion: "Cable HDMI 2.1 compatible con 4K a 120Hz.",
    imagenUrl:
      "https://www.distytechnologies.com/1371-large_default/ugreen-cable-hdmi-21-male-to-male-2m.jpg",
  },
  {
    categoria: "Insumos",
    nombre: "Cartucho 664 Negro",
    marca: "HP",
    precio: 18000,
    stock: 35,
    descripcion: "Cartucho de tinta negra original para impresoras HP.",
    imagenUrl:
      "https://exitocol.vtexassets.com/arquivos/ids/24375025/cartucho-hp-664-negro.jpg?v=638606268760300000",
  },
  {
    categoria: "Insumos",
    nombre: "Toner 85A",
    marca: "HP",
    precio: 65000,
    stock: 0,
    descripcion: "Toner original para impresoras laser HP.",
    imagenUrl:
      "https://m.media-amazon.com/images/I/81UlDTdgR5L._AC_SL1500_.jpg",
  },
  {
    categoria: "Insumos",
    nombre: "Pendrive 64GB",
    marca: "Kingston",
    precio: 8000,
    stock: 60,
    descripcion: "Memoria USB 3.2 de 64GB.",
    imagenUrl: "https://m.media-amazon.com/images/I/61abRJNk3cL._AC_.jpg",
  },
] as const satisfies readonly ProductoSeed[];

type NombreProducto =
  | (typeof componentes)[number]["nombre"]
  | (typeof otrosProductos)[number]["nombre"];

// Idiomas del usuario (Usuario.idIdioma es obligatorio). Los productos se cargan
// solo en espanol; las traducciones de producto quedan para mas adelante.
const idiomas = [
  { codigo: "es", nombre: "Espanol" },
  { codigo: "en", nombre: "English" },
] as const;
type CodigoIdioma = (typeof idiomas)[number]["codigo"];

// Traducciones al ingles de los productos del catalogo
const traduccionesEn: Partial<
  Record<NombreProducto, { nombre: string; descripcion: string }>
> = {
  // Componentes PC
  "Ryzen 5 7600": {
    nombre: "AMD Ryzen 5 7600 Processor",
    descripcion: "6-core processor for gaming and general purpose.",
  },
  "Core i7-14700K": {
    nombre: "Intel Core i7-14700K Processor",
    descripcion: "High-performance 20-core desktop processor.",
  },
  "Core i5-14400F": {
    nombre: "Intel Core i5-14400F Processor",
    descripcion: "10-core processor without integrated graphics.",
  },
  "GeForce RTX 4060": {
    nombre: "GeForce RTX 4060 Graphics Card",
    descripcion: "Ideal graphics card for 1080p gaming.",
  },
  "GeForce RTX 5060 Ti 16GB": {
    nombre: "GeForce RTX 5060 Ti 16GB Graphics Card",
    descripcion: "Ideal graphics card for 1080p and 1440p gaming.",
  },
  "GeForce RTX 4070": {
    nombre: "GeForce RTX 4070 Graphics Card",
    descripcion: "Graphics card for 1440p gaming with ray tracing.",
  },
  "Radeon RX 7600": {
    nombre: "Radeon RX 7600 Graphics Card",
    descripcion: "AMD graphics card built for 1080p gaming.",
  },
  "Fury Beast 16GB DDR5": {
    nombre: "Fury Beast 16GB DDR5 Memory",
    descripcion: "16GB DDR5 RAM memory module.",
  },
  "Vengeance 16GB DDR4": {
    nombre: "Vengeance 16GB DDR4 Memory",
    descripcion: "16GB DDR4 RAM memory module.",
  },
  "B650M Gaming": {
    nombre: "B650M Gaming Motherboard",
    descripcion: "Micro ATX motherboard for AM5 processors.",
  },
  "Z790 Tomahawk": {
    nombre: "Z790 Tomahawk Motherboard",
    descripcion: "ATX motherboard for Intel LGA1700 processors.",
  },
  RM750e: {
    nombre: "RM750e Power Supply",
    descripcion: "750W fully modular power supply.",
  },
  "MWE 550 Bronze": {
    nombre: "MWE 550 Bronze Power Supply",
    descripcion: "550W power supply for mid-range builds.",
  },
  "SSD 990 EVO 1TB": {
    nombre: "SSD 990 EVO 1TB Drive",
    descripcion: "1TB NVMe solid state drive.",
  },
  "Barracuda 2TB": {
    nombre: "Barracuda 2TB Hard Drive",
    descripcion: "2TB hard drive for mass storage.",
  },
  // Otros productos
  "PC Gamer Ryzen 5 RTX 4060": {
    nombre: "Gaming PC Ryzen 5 RTX 4060",
    descripcion: "Prebuilt desktop PC with Ryzen 5, 16GB RAM, and RTX 4060.",
  },
  "Teclado Mecanico K95": {
    nombre: "K95 Mechanical Keyboard",
    descripcion: "Mechanical gaming keyboard with programmable macro keys.",
  },
  "Mouse Gamer G203": {
    nombre: "G203 Gaming Mouse",
    descripcion: "Gaming mouse with customizable RGB lighting.",
  },
  "Auriculares HyperX Cloud II": {
    nombre: "HyperX Cloud II Headset",
    descripcion: "Gaming headset with 7.1 surround sound.",
  },
  'Monitor 24" 144Hz': {
    nombre: '24" 144Hz Gaming Monitor',
    descripcion: "24-inch Full HD monitor at 144Hz.",
  },
};
const tiposNotificacion = [
  {
    codigo: "VENTA_CONFIRMADA",
    plantillaMensaje: "Tu compra #{idVenta} fue confirmada.",
  },
  {
    codigo: "VENTA_ENVIADA",
    plantillaMensaje: "Tu compra #{idVenta} fue enviada.",
  },
  {
    codigo: "SOLICITUD_RECIBIDA",
    plantillaMensaje: "Recibimos tu solicitud de servicio #{idSolicitud}.",
  },
  {
    codigo: "SOLICITUD_DIAGNOSTICADA",
    plantillaMensaje: "Tu solicitud #{idSolicitud} ya tiene diagnostico.",
  },
];

// Object.entries pierde el tipo de las claves; este helper lo conserva.
const entries = <T extends object>(obj: T) =>
  Object.entries(obj) as [Extract<keyof T, string>, T[keyof T]][];

// Crea (o actualiza) un usuario con su cuenta de email y contraseña, igual que lo
// haria Better Auth en el registro. Se usa el hash de Better Auth para que el login funcione.
type DatosUsuario = Omit<Prisma.UsuarioUncheckedCreateInput, "id">;

async function upsertUsuario(datos: DatosUsuario, password: string) {
  const usuario = await prisma.usuario.upsert({
    where: { correo: datos.correo },
    create: datos,
    update: datos,
  });

  const hash = await hashPassword(password);
  const cuenta = await prisma.cuenta.findFirst({
    where: { idUsuario: usuario.id, providerId: "credential" },
  });
  if (cuenta) {
    await prisma.cuenta.update({
      where: { id: cuenta.id },
      data: { password: hash },
    });
  } else {
    await prisma.cuenta.create({
      data: {
        idUsuario: usuario.id,
        accountId: String(usuario.id),
        providerId: "credential",
        password: hash,
      },
    });
  }
  return usuario;
}
const entries = <T extends object>(obj: T) =>
  Object.entries(obj) as [Extract<keyof T, string>, T[keyof T]][];

async function main() {
  // 1. Idiomas (se ejecuta SIEMPRE, aunque ya haya productos)
  const idsIdioma = {} as Record<CodigoIdioma, number>;
  for (const idioma of idiomas) {
    const creado = await prisma.idioma.upsert({
      where: { codigo: idioma.codigo },
      create: idioma,
      update: {},
    });
    idsIdioma[idioma.codigo] = creado.idIdioma;
  }

  //Usuarios (se ejecuta SIEMPRE, aunque ya haya productos)
  const admin = await upsertUsuario(
    {
      nombreCompleto: "Administrador",
      correo: "admin@admin.com",
      correoVerificado: true,
      rol: "ADMIN",
      idIdioma: idsIdioma.es,
      cargo: "Administrador general",
    },
    "admin",
  );

  const cliente = await upsertUsuario(
    {
      nombreCompleto: "Usuario de Prueba",
      correo: "user@user.com",
      correoVerificado: true,
      rol: "CLIENTE",
      idIdioma: idsIdioma.es,
      direccion: "Calle Falsa 123",
      telefono: "2995551234",
    },
    "user",
  );
  console.log(`Admin   -> ${admin.correo} / admin`);
  console.log(`Usuario -> ${cliente.correo} / user`);

  // Catálogo: solo se crea si todavía no hay productos
  if ((await prisma.producto.count()) === 0) {
    const categorias = {} as Record<NombreCategoria, number>;
    for (const nombre of CATEGORIAS) {
      const c = await prisma.categoria.create({ data: { nombre } });
      categorias[nombre] = c.idCategoria;
    }

    const tipos = {} as Record<TipoComponente, number>;
    const atributos = {} as Record<TipoComponente, Record<string, number>>;
    for (const [nombre, lista] of entries(atributosPorTipo)) {
      const tipo = await prisma.tipoComponente.create({
        data: {
          nombre,
          atributos: {
            create: lista.map(([n, unidad]) => ({ nombre: n, unidad })),
          },
        },
        include: { atributos: true },
      });
      tipos[nombre] = tipo.idTipoComponente;
      atributos[nombre] = Object.fromEntries(
        tipo.atributos.map((a) => [a.nombre, a.idAtributo]),
      );
    }

    const idsPorNombre = {} as Record<NombreProducto, number>;
    for (const c of componentes) {
      const producto = await prisma.producto.create({
        data: {
          nombre: c.nombre,
          descripcion: c.descripcion,
          marca: c.marca,
          precio: c.precio,
          stock: c.stock,
          imagenUrl: c.imagenUrl,
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

    for (const p of otrosProductos) {
      const producto = await prisma.producto.create({
        data: {
          nombre: p.nombre,
          descripcion: p.descripcion,
          marca: p.marca,
          precio: p.precio,
          stock: p.stock,
          imagenUrl: p.imagenUrl,
          idCategoria: categorias[p.categoria],
        },
      });
      idsPorNombre[p.nombre] = producto.idProducto;
    }

    await prisma.tipoNotificacion.createMany({ data: tiposNotificacion });

    const piezas: {
      nombre: (typeof componentes)[number]["nombre"];
      cantidad: number;
    }[] = [
      { nombre: "Ryzen 5 7600", cantidad: 1 },
      { nombre: "B650M Gaming", cantidad: 1 },
      { nombre: "Fury Beast 16GB DDR5", cantidad: 2 },
      { nombre: "GeForce RTX 4060", cantidad: 1 },
      { nombre: "SSD 990 EVO 1TB", cantidad: 1 },
    ];
    const potenciaWatts = piezas.reduce(
      (total, p) =>
        total +
        componentes.find((c) => c.nombre === p.nombre)!.watts * p.cantidad,
      0,
    );
    await prisma.preset.create({
      data: {
        idUsuario: cliente.id,
        nombre: "PC Gamer AM5",
        potenciaWatts,
        componentes: {
          create: piezas.map((p) => ({
            idProducto: idsPorNombre[p.nombre],
            cantidad: p.cantidad,
          })),
        },
      },
    });

    const sinStock = [...componentes, ...otrosProductos]
      .filter((p) => p.stock === 0)
      .map((p) => p.nombre);
    console.log(
      `${componentes.length + otrosProductos.length} productos creados (${componentes.length} componentes de PC).`,
    );
    console.log(`Sin stock: ${sinStock.join(", ")}`);
  } else {
    console.log("El catalogo ya existe, se saltea la creacion de productos.");
  }

  // TRADUCCIONES: Se ejecuta SIEMPRE y guarda traduccionesEn en la tabla TraduccionProducto
  let traduccionesCargadas = 0;
  for (const [nombreOriginal, trad] of entries(traduccionesEn)) {
    if (!trad) continue;

    const prod = await prisma.producto.findFirst({
      where: { nombre: nombreOriginal },
      select: { idProducto: true },
    });
    if (!prod) continue;

    await prisma.traduccionProducto.upsert({
      where: {
        idProducto_idIdioma: {
          idProducto: prod.idProducto,
          idIdioma: idsIdioma.en,
        },
      },
      create: {
        idProducto: prod.idProducto,
        idIdioma: idsIdioma.en,
        nombreTraducido: trad.nombre,
        descripcionTraducida: trad.descripcion,
      },
      update: {
        nombreTraducido: trad.nombre,
        descripcionTraducida: trad.descripcion,
      },
    });
    traduccionesCargadas++;
  }

  console.log(`Traducciones (en) sincronizadas: ${traduccionesCargadas}.`);
  console.log("Seed finalizado correctamente.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
