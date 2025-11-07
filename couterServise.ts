import { PrismaClient, Counter } from "./generated/prisma";

const prisma = new PrismaClient();

export async function getNextId(counterName: string): Promise<number> {
  const counter = await prisma.counter.upsert({
    where: { name: counterName },
    update: {
      value: { increment: 1 }
    },
    create: {
      name: counterName,
      value: 1
    }
  });

  return counter.value;
}