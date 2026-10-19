import os from "node:os";

// IP de esta PC en la red local (ej. 192.168.1.50), para armar la URL del QR que abre el celular.
// Si se elige mal (pasa con VPN, Docker, WSL o maquinas virtuales), se puede forzar con IP_LOCAL en el .env.

// Adaptadores virtuales: tienen IP pero el celular no los puede alcanzar
const VIRTUALES = /vethernet|virtualbox|vmware|wsl|docker|hyper-v|loopback|tailscale|zerotier|hamachi|vpn|utun|bridge/i;

// Primero las redes de wifi hogareño (192.168.x.x), despues las otras privadas
function prioridad(ip: string): number {
  if (ip.startsWith("192.168.")) return 0;
  if (ip.startsWith("10.")) return 1;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 2;
  return 3;
}

export function ipLocal(): string | null {
  const forzada = process.env.IP_LOCAL?.trim();
  if (forzada) return forzada;

  const candidatas: string[] = [];
  for (const [nombre, interfaces] of Object.entries(os.networkInterfaces())) {
    if (VIRTUALES.test(nombre)) continue;
    for (const i of interfaces ?? []) {
      if (i.family === "IPv4" && !i.internal && !i.address.startsWith("169.254.")) candidatas.push(i.address);
    }
  }
  candidatas.sort((a, b) => prioridad(a) - prioridad(b));
  return candidatas[0] ?? null;
}
