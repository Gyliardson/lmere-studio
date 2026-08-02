import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';

function uuid() {
  return crypto.randomUUID();
}

async function main() {
  await prisma.tenant.deleteMany({
    where: { slug: 'doce-arte' }
  });

  const tenantId = uuid();
  const adminHash = bcryptjs.hashSync("admin123", 10);

  const tenant = await prisma.tenant.create({
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
      buttonColor: "#8B5CF6",
      textColor: "#FFFFFF",
      adminPasswordHash: adminHash,
      maxOrdersPerDay: 5,
      featuresConfig: JSON.stringify({
        allow_photo_upload: true,
        deposit_mode: "50_percent",
        enable_delivery_step: false,
        custom_fields: [],
      })
    }
  });

  const sizes = [
    { name: "Mini Bolo", servings: "5-8 pessoas", weightKg: 1.0, basePrice: 89.90, maxFillings: 1, sortOrder: 0 },
    { name: "Pequeno", servings: "10-15 pessoas", weightKg: 1.5, basePrice: 139.90, maxFillings: 2, sortOrder: 1 },
    { name: "Médio", servings: "20-25 pessoas", weightKg: 2.5, basePrice: 199.90, maxFillings: 2, sortOrder: 2 },
    { name: "Grande", servings: "30-40 pessoas", weightKg: 3.5, basePrice: 279.90, maxFillings: 3, sortOrder: 3 },
  ];

  const sizeIds: Record<string, string> = {};
  for (const s of sizes) {
    const id = uuid();
    sizeIds[s.name] = id;
    await prisma.cakeSize.create({
      data: {
        id,
        tenantId,
        name: s.name,
        servings: s.servings,
        weightKg: s.weightKg,
        basePrice: s.basePrice,
        maxFillings: s.maxFillings,
        sortOrder: s.sortOrder,
        active: true,
      }
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
  for (const f of flavors) {
    const id = uuid();
    flavorIds[f.name] = id;
    await prisma.cakeFlavor.create({
      data: {
        id,
        tenantId,
        name: f.name,
        type: f.type as any,
        additionalPrice: f.additionalPrice,
        isSpecial: f.isSpecial,
        imageUrl: f.imageUrl,
        sortOrder: f.sortOrder,
        active: true,
      }
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

  for (const a of addons) {
    await prisma.addon.create({
      data: {
        id: uuid(),
        tenantId,
        name: a.name,
        description: a.description,
        price: a.price,
        imageUrl: a.imageUrl,
        sortOrder: a.sortOrder,
        active: true,
      }
    });
  }

  const weekdays = [
    { dayOfWeek: 0, isOpen: false },
    { dayOfWeek: 1, isOpen: true },
    { dayOfWeek: 2, isOpen: true },
    { dayOfWeek: 3, isOpen: true },
    { dayOfWeek: 4, isOpen: true },
    { dayOfWeek: 5, isOpen: true },
    { dayOfWeek: 6, isOpen: true },
  ];

  for (const w of weekdays) {
    await prisma.workSchedule.create({
      data: {
        id: uuid(),
        tenantId,
        dayOfWeek: w.dayOfWeek,
        isOpen: w.isOpen,
      }
    });
  }

  const today = new Date();
  const dateStr = (offsetDays: number) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offsetDays);
    return d.toISOString().split("T")[0];
  };

  const blockedDates = [dateStr(3), dateStr(7), dateStr(14)];
  for (const d of blockedDates) {
    await prisma.blockedDate.create({
      data: {
        id: uuid(),
        tenantId,
        date: d,
        reason: "Agenda Lotada",
      }
    });
  }

  const mockOrders = [
    {
      name: "Juliana Costa",
      phone: "11988776655",
      eventDate: dateStr(2),
      sizeId: sizeIds["Médio"],
      flavorId: flavorIds["Red Velvet"],
      fillings: [flavorIds["Ninho com Nutella"]],
      addons: [],
      msg: "Parabéns Ju 30 Anos",
      details: "Bolo com acabamento espatulado floral",
      subtotal: 234.90,
      deposit: 117.45,
      status: "PENDING",
    },
    {
      name: "Mariana Silva",
      phone: "11998877665",
      eventDate: dateStr(4),
      sizeId: sizeIds["Pequeno"],
      flavorId: flavorIds["Baunilha"],
      fillings: [flavorIds["Brigadeiro"]],
      addons: [],
      msg: "Festa da Mari",
      details: "Laço rosa de fita na embalagem",
      subtotal: 139.90,
      deposit: 69.95,
      status: "APPROVED",
    },
    {
      name: "Lucas Andrade",
      phone: "11977665544",
      eventDate: dateStr(5),
      sizeId: sizeIds["Grande"],
      flavorId: flavorIds["Chocolate"],
      fillings: [flavorIds["Frutas Vermelhas"]],
      addons: [],
      msg: "Festa de 1 Aninho",
      details: "Decoração temática safari",
      subtotal: 304.90,
      deposit: 152.45,
      status: "IN_PRODUCTION",
    },
    {
      name: "Camila Rodrigues",
      phone: "11966554433",
      eventDate: dateStr(1),
      sizeId: sizeIds["Mini Bolo"],
      flavorId: flavorIds["Baunilha"],
      fillings: [flavorIds["Doce de Leite"]],
      addons: [],
      msg: "Com Carinho",
      details: "Entregar até às 14h",
      subtotal: 89.90,
      deposit: 44.95,
      status: "READY",
    },
    {
      name: "Fernanda Oliveira",
      phone: "11955443322",
      eventDate: dateStr(-1),
      sizeId: sizeIds["Médio"],
      flavorId: flavorIds["Red Velvet"],
      fillings: [flavorIds["Pistache"]],
      addons: [],
      msg: "Casamento Fernanda & Thiago",
      details: "Bolo de 2 andares decorado",
      subtotal: 269.90,
      deposit: 134.95,
      status: "DELIVERED",
    },
  ];

  for (const o of mockOrders) {
    await prisma.order.create({
      data: {
        id: uuid(),
        tenantId,
        customerName: o.name,
        customerPhone: o.phone,
        eventDate: o.eventDate,
        cakeSizeId: o.sizeId,
        flavorId: o.flavorId,
        fillingIds: JSON.stringify(o.fillings),
        addonIds: JSON.stringify(o.addons),
        referenceImageUrl: "",
        cakeMessage: o.msg,
        details: o.details,
        subtotal: o.subtotal,
        depositAmount: o.deposit,
        depositMode: "50_percent",
        status: o.status as any,
      }
    });
  }

  console.log("[SUCCESS] Seed completed. Demo tenant and mock orders created:");
  console.log("  Name: Doce Arte Confeitaria");
  console.log("  Slug: doce-arte");
  console.log("  Admin Password: admin123");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
