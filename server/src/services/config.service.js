import prisma from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';

export async function getAll() {
  return await prisma.systemConfig.findMany();
}

export async function get(key) {
  const config = await prisma.systemConfig.findUnique({
    where: { configKey: key }
  });
  
  if (!config) {
    throw new NotFoundError(`Config key '${key}' not found`);
  }
  
  return config.configValue;
}

export async function update(key, value) {
  return await prisma.systemConfig.update({
    where: { configKey: key },
    data: { configValue: value }
  });
}

export async function getAsNumber(key) {
  const value = await get(key);
  return parseInt(value, 10);
}
