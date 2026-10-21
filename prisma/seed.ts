import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  await p.payment.deleteMany(); await p.booking.deleteMany(); await p.travelService.deleteMany();
  await p.travelService.createMany({ data: [
    { type: "FLIGHT", name: "IndiGo 6E-512", source: "Nagpur", destination: "Mumbai", price: 4500, available: true },
    { type: "TRAIN", name: "Vidarbha Express", source: "Nagpur", destination: "Mumbai", price: 900, available: true },
    { type: "BUS", name: "Neeta Travels Sleeper", source: "Nagpur", destination: "Pune", price: 1200, available: true },
    { type: "HOTEL", name: "Hotel Sea View", source: "Mumbai", destination: "Mumbai", price: 3000, available: true },
    { type: "FLIGHT", name: "Air India AI-630 (sold out)", source: "Nagpur", destination: "Delhi", price: 6000, available: false },
  ]});
}
main().finally(() => p.$disconnect());
