import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const sampleServices = [
  { type: "FLIGHT", name: "IndiGo 6E-512", source: "Nagpur", destination: "Mumbai", price: 4500, available: true },
  { type: "TRAIN", name: "Vidarbha Express", source: "Nagpur", destination: "Mumbai", price: 900, available: true },
  { type: "BUS", name: "Neeta Travels Sleeper", source: "Nagpur", destination: "Pune", price: 1200, available: true },
  { type: "HOTEL", name: "Hotel Sea View", source: "Mumbai", destination: "Mumbai", price: 3000, available: true },
  { type: "FLIGHT", name: "Air India AI-630 (sold out)", source: "Nagpur", destination: "Delhi", price: 6000, available: false },
];

async function main() {
  for (const service of sampleServices) {
    const existing = await prisma.travelService.findFirst({
      where: { type: service.type, name: service.name, source: service.source, destination: service.destination },
      select: { id: true },
    });
    if (!existing) await prisma.travelService.create({ data: service });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
