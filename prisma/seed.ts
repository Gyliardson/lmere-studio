import "dotenv/config";
import bcryptjs from "bcryptjs";
import crypto from "crypto";

import { getBusinessQuickDate } from "../src/lib/business-calendar";
import { assertDemoSeedAllowed } from "../src/lib/demo-seed-guard";
import { prisma } from "../src/lib/prisma";

function uuid() {
  return crypto.randomUUID();
}

async function main() {
  const preflight = assertDemoSeedAllowed();
  console.log(`[DEMO SEED] Explicit opt-in accepted for target ${preflight.targetDatabase}`);
  console.log("[DEMO SEED] Replacing only the synthetic tenant slug 'doce-arte'.");

  await prisma.tenant.deleteMany({
    where: { slug: "doce-arte" },
  });

  const tenantId = uuid();
  const demoAdminPassword = process.env.LMERE_DEMO_ADMIN_PASSWORD || "admin123";
  const adminHash = bcryptjs.hashSync(demoAdminPassword, 10);

  await prisma.tenant.create({
    data: {
      id: tenantId,
      slug: "doce-arte",
      name: "Doce Arte Confeitaria",
      logoUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&h=200&fit=crop",
      bannerUrl: "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=1200&h=400&fit=crop",
      whatsapp: "5511999999999",
      pixKey: "confeitaria@docearte.com.br",
      primaryColor: "#8B5CF6",
      secondaryColor: "#EC4899",
      backgroundColor: "#0F0A1A",
      buttonColor: "#7C3AED",
      textColor: "#FFFFFF",
      adminPasswordHash: adminHash,
      maxOrdersPerDay: 5,
      featuresConfig: JSON.stringify({
        allow_photo_upload: true,
        deposit_mode: "50_percent",
        enable_delivery_step: false,
        custom_fields: [],
      }),
    },
  });

  const sizes = [
    { name: "Mini Bolo", servings: "5-8 pessoas", weightKg: 1.0, basePrice: 89.90, maxFillings: 1, sortOrder: 0 },
    { name: "Pequeno", servings: "10-15 pessoas", weightKg: 1.5, basePrice: 139.90, maxFillings: 2, sortOrder: 1 },
    { name: "Médio", servings: "20-25 pessoas", weightKg: 2.5, basePrice: 199.90, maxFillings: 2, sortOrder: 2 },
    { name: "Grande", servings: "30-40 pessoas", weightKg: 3.5, basePrice: 279.90, maxFillings: 3, sortOrder: 3 },
  ];

  const sizeIds: Record<string, string> = {};
  for (const size of sizes) {
    const id = uuid();
    sizeIds[size.name] = id;
    await prisma.cakeSize.create({
      data: {
        id,
        tenantId,
        name: size.name,
        servings: size.servings,
        weightKg: size.weightKg,
        basePrice: size.basePrice,
        maxFillings: size.maxFillings,
        sortOrder: size.sortOrder,
        active: true,
      },
    });
  }

  const flavors = [
    { name: "Baunilha", type: "MASSA", additionalPrice: 0, isSpecial: false, imageUrl: "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=300&h=300&fit=crop", sortOrder: 0 },
    { name: "Chocolate", type: "MASSA", additionalPrice: 0, isSpecial: false, imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&h=300&fit=crop", sortOrder: 1 },
    { name: "Red Velvet", type: "MASSA", additionalPrice: 15, isSpecial: true, imageUrl: "https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?w=300&h=300&fit=crop", sortOrder: 2 },
    { name: "Cenoura", type: "MASSA", additionalPrice: 0, isSpecial: false, imageUrl: "https://images.unsplash.com/photo-1621955511667-e2c316e4575d?w=300&h=300&fit=crop", sortOrder: 3 },
    { name: "Brigadeiro", type: "RECHEIO", additionalPrice: 0, isSpecial: false, imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=300&h=300&fit=crop", sortOrder: 0 },
    { name: "Beijinho", type: "RECHEIO", additionalPrice: 0, isSpecial: false, imageUrl: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=300&h=300&fit=crop", sortOrder: 1 },
    { name: "Doce de Leite", type: "RECHEIO", additionalPrice: 0, isSpecial: false, imageUrl: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=300&h=300&fit=crop", sortOrder: 2 },
    { name: "Ninho com Nutella", type: "RECHEIO", additionalPrice: 20, isSpecial: true, imageUrl: "https://images.unsplash.com/photo-1607920591413-4ec007e70023?w=300&h=300&fit=crop", sortOrder: 3 },
    { name: "Frutas Vermelhas", type: "RECHEIO", additionalPrice: 25, isSpecial: true, imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&h=300&fit=crop", sortOrder: 4 },
    { name: "Pistache", type: "RECHEIO", additionalPrice: 35, isSpecial: true, imageUrl: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=300&h=300&fit=crop", sortOrder: 5 },
    { name: "Morango", type: "RECHEIO", additionalPrice: 10, isSpecial: false, imageUrl: "https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=300&h=300&fit=crop", sortOrder: 6 },
    { name: "Maracujá", type: "RECHEIO", additionalPrice: 10, isSpecial: false, imageUrl: "https://images.unsplash.com/photo-1546039907-7fa05f864c02?w=300&h=300&fit=crop", sortOrder: 7 },
  ];

  const flavorIds: Record<string, string> = {};
  for (const flavor of flavors) {
    const id = uuid();
    flavorIds[flavor.name] = id;
    await prisma.cakeFlavor.create({
      data: {
        id,
        tenantId,
        name: flavor.name,
        type: flavor.type,
        additionalPrice: flavor.additionalPrice,
        isSpecial: flavor.isSpecial,
        imageUrl: flavor.imageUrl,
        sortOrder: flavor.sortOrder,
        active: true,
      },
    });
  }

  const addons = [
    { name: "Topo de Bolo Personalizado", description: "Topo em acrílico com nome e idade", price: 35, imageUrl: "https://images.unsplash.com/photo-1535254973040-607b474cb50d?w=300&h=300&fit=crop", sortOrder: 0 },
    { name: "Caixa de Brigadeiros (25 un.)", description: "Brigadeiros gourmet sortidos", price: 65, imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=300&h=300&fit=crop", sortOrder: 1 },
    { name: "Caixa de Bem-Casados (20 un.)", description: "Bem-casados tradicionais embalados", price: 80, imageUrl: "https://images.unsplash.com/photo-1558301211-0d8c8ddee6ec?w=300&h=300&fit=crop", sortOrder: 2 },
    { name: "Cupcakes Decorados (12 un.)", description: "Cupcakes temáticos com cobertura", price: 55, imageUrl: "https://images.unsplash.com/photo-1587668178277-295251f900ce?w=300&h=300&fit=crop", sortOrder: 3 },
    { name: "Embalagem Premium", description: "Caixa decorativa com laço de fita", price: 25, imageUrl: "https://images.unsplash.com/photo-1549488344-cbb6c34cf1ac?w=300&h=300&fit=crop", sortOrder: 4 },
    { name: "Velas Personalizadas", description: "Kit de velas com número da idade", price: 15, imageUrl: "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=300&h=300&fit=crop", sortOrder: 5 },
  ];

  for (const addon of addons) {
    await prisma.addon.create({
      data: {
        id: uuid(),
        tenantId,
        name: addon.name,
        description: addon.description,
        price: addon.price,
        imageUrl: addon.imageUrl,
        sortOrder: addon.sortOrder,
        active: true,
      },
    });
  }

  for (const [dayOfWeek, isOpen] of [false, true, true, true, true, true, true].entries()) {
    await prisma.workSchedule.create({
      data: { id: uuid(), tenantId, dayOfWeek, isOpen },
    });
  }

  const dateStr = (offsetDays: number) => getBusinessQuickDate(offsetDays);
  for (const date of [dateStr(3), dateStr(7), dateStr(14)]) {
    await prisma.blockedDate.create({
      data: { id: uuid(), tenantId, date, reason: "Agenda Lotada" },
    });
  }

  const mockOrders = [
    { name: "Juliana Costa", phone: "11988776655", eventDate: dateStr(2), sizeId: sizeIds["Médio"], flavorId: flavorIds["Red Velvet"], fillings: [flavorIds["Ninho com Nutella"]], msg: "Parabéns Ju 30 Anos", details: "Bolo com acabamento espatulado floral", subtotal: 234.90, deposit: 117.45, status: "pending" },
    { name: "Mariana Silva", phone: "11998877665", eventDate: dateStr(4), sizeId: sizeIds["Pequeno"], flavorId: flavorIds["Baunilha"], fillings: [flavorIds["Brigadeiro"]], msg: "Festa da Mari", details: "Laço rosa de fita na embalagem", subtotal: 139.90, deposit: 69.95, status: "confirmed" },
    { name: "Lucas Andrade", phone: "11977665544", eventDate: dateStr(5), sizeId: sizeIds["Grande"], flavorId: flavorIds["Chocolate"], fillings: [flavorIds["Frutas Vermelhas"]], msg: "Festa de 1 Aninho", details: "Decoração temática safari", subtotal: 304.90, deposit: 152.45, status: "confirmed" },
    { name: "Camila Rodrigues", phone: "11966554433", eventDate: dateStr(1), sizeId: sizeIds["Mini Bolo"], flavorId: flavorIds["Baunilha"], fillings: [flavorIds["Doce de Leite"]], msg: "Com Carinho", details: "Entregar até às 14h", subtotal: 89.90, deposit: 44.95, status: "completed" },
    { name: "Fernanda Oliveira", phone: "11955443322", eventDate: dateStr(-1), sizeId: sizeIds["Médio"], flavorId: flavorIds["Red Velvet"], fillings: [flavorIds["Pistache"]], msg: "Casamento Fernanda & Thiago", details: "Bolo de 2 andares decorado", subtotal: 269.90, deposit: 134.95, status: "cancelled" },
  ];

  for (const order of mockOrders) {
    await prisma.order.create({
      data: {
        id: uuid(),
        tenantId,
        customerName: order.name,
        customerPhone: order.phone,
        eventDate: order.eventDate,
        cakeSizeId: order.sizeId,
        flavorId: order.flavorId,
        fillingIds: JSON.stringify(order.fillings),
        addonIds: "[]",
        referenceImageUrl: "",
        cakeMessage: order.msg,
        details: order.details,
        subtotal: order.subtotal,
        depositAmount: order.deposit,
        depositMode: "50_percent",
        status: order.status,
      },
    });
  }

  console.log("[SUCCESS] Synthetic demo tenant and mock orders created.");
  console.log("  Name: Doce Arte Confeitaria");
  console.log("  Slug: doce-arte");
  console.log("  Admin credential: configured for demo use (value intentionally not logged)");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Demo seed failed");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
