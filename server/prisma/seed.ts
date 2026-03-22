import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create company
  const company = await prisma.company.create({
    data: {
      name: 'Restaurante Demo',
      slug: 'restaurante-demo',
    },
  });

  // Create owner user (password: Admin123!)
  const hashedPassword = await bcrypt.hash('Admin123!', 12);
  await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      password: hashedPassword,
      name: 'Admin Demo',
      role: 'OWNER',
      companyId: company.id,
    },
  });

  // Create categories
  const entrantes = await prisma.category.create({
    data: { name: 'Entrantes', order: 1, companyId: company.id },
  });

  const principales = await prisma.category.create({
    data: { name: 'Principales', order: 2, companyId: company.id },
  });

  const postres = await prisma.category.create({
    data: { name: 'Postres', order: 3, companyId: company.id },
  });

  const bebidas = await prisma.category.create({
    data: { name: 'Bebidas', order: 4, companyId: company.id },
  });

  // Create products
  await prisma.product.createMany({
    data: [
      {
        name: 'Patatas bravas',
        description: 'Patatas fritas con salsa brava y alioli',
        price: 5.50,
        categoryId: entrantes.id,
        companyId: company.id,
        extras: [
          { name: 'Extra salsa brava', price: 0.50 },
          { name: 'Extra alioli', price: 0.50 },
        ],
      },
      {
        name: 'Croquetas caseras',
        description: 'Croquetas de jamón ibérico (6 uds)',
        price: 7.00,
        categoryId: entrantes.id,
        companyId: company.id,
        extras: [],
      },
      {
        name: 'Ensalada César',
        description: 'Lechuga, pollo, parmesano, croutons y salsa César',
        price: 8.50,
        categoryId: entrantes.id,
        companyId: company.id,
        extras: [
          { name: 'Extra pollo', price: 2.00 },
        ],
      },
      {
        name: 'Hamburguesa clásica',
        description: 'Carne de ternera 200g, lechuga, tomate, cebolla y salsa especial',
        price: 12.00,
        categoryId: principales.id,
        companyId: company.id,
        extras: [
          { name: 'Extra queso', price: 1.50 },
          { name: 'Extra bacon', price: 1.50 },
          { name: 'Doble carne', price: 3.00 },
        ],
      },
      {
        name: 'Pizza Margarita',
        description: 'Tomate, mozzarella y albahaca fresca',
        price: 10.00,
        categoryId: principales.id,
        companyId: company.id,
        extras: [
          { name: 'Extra mozzarella', price: 1.50 },
          { name: 'Jamón', price: 2.00 },
        ],
      },
      {
        name: 'Solomillo a la plancha',
        description: 'Solomillo de ternera con guarnición de verduras',
        price: 18.50,
        categoryId: principales.id,
        companyId: company.id,
        extras: [
          { name: 'Patatas fritas', price: 2.50 },
          { name: 'Ensalada', price: 2.00 },
        ],
      },
      {
        name: 'Tarta de queso',
        description: 'Tarta de queso al horno con mermelada de frutos rojos',
        price: 5.50,
        categoryId: postres.id,
        companyId: company.id,
        extras: [],
      },
      {
        name: 'Tiramisú',
        description: 'Tiramisú casero con café y mascarpone',
        price: 6.00,
        categoryId: postres.id,
        companyId: company.id,
        extras: [],
      },
      {
        name: 'Coca-Cola',
        description: 'Coca-Cola 33cl',
        price: 2.50,
        categoryId: bebidas.id,
        companyId: company.id,
        extras: [],
      },
      {
        name: 'Agua mineral',
        description: 'Botella de agua 50cl',
        price: 1.50,
        categoryId: bebidas.id,
        companyId: company.id,
        extras: [],
      },
      {
        name: 'Cerveza',
        description: 'Caña de cerveza artesana',
        price: 3.00,
        categoryId: bebidas.id,
        companyId: company.id,
        extras: [],
      },
      {
        name: 'Copa de vino tinto',
        description: 'Vino tinto de la casa',
        price: 3.50,
        categoryId: bebidas.id,
        companyId: company.id,
        extras: [],
      },
    ],
  });

  // Create tables
  await prisma.table.createMany({
    data: [
      { name: 'Mesa 1', posX: 50, posY: 50, width: 100, height: 80, companyId: company.id },
      { name: 'Mesa 2', posX: 200, posY: 50, width: 100, height: 80, companyId: company.id },
      { name: 'Mesa 3', posX: 350, posY: 50, width: 100, height: 80, companyId: company.id },
      { name: 'Mesa 4', posX: 50, posY: 200, width: 100, height: 80, companyId: company.id },
      { name: 'Mesa 5', posX: 200, posY: 200, width: 100, height: 80, companyId: company.id },
      { name: 'Mesa 6', posX: 350, posY: 200, width: 100, height: 80, companyId: company.id },
    ],
  });

  console.log('Seed completed successfully!');
  console.log('Login: admin@demo.com / Admin123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
