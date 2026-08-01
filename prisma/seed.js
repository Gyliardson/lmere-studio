/* eslint-disable @typescript-eslint/no-require-imports */
const Database = require("better-sqlite3");
const bcryptjs = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");

function uuid() {
  return crypto.randomUUID();
}

const dbPath = path.join(__dirname, "..", "dev.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

function main() {
  db.prepare(`DELETE FROM Tenant WHERE slug = 'doce-arte'`).run();

  const tenantId = uuid();
  const adminHash = bcryptjs.hashSync("admin123", 10);

  db.prepare(`
    INSERT INTO Tenant (id, slug, name, logoUrl, bannerUrl, whatsapp, pixKey,
      primaryColor, secondaryColor, backgroundColor, buttonColor, textColor,
      adminPasswordHash, maxOrdersPerDay, featuresConfig, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    tenantId,
    "doce-arte",
    "Doce Arte Confeitaria",
    "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=1200&h=400&fit=crop",
    "5511999999999",
    "confeitaria@docearte.com.br",
    "#8B5CF6",
    "#EC4899",
    "#0F0A1A",
    "#8B5CF6",
    "#FFFFFF",
    adminHash,
    5,
    JSON.stringify({
      allow_photo_upload: true,
      deposit_mode: "50_percent",
      enable_delivery_step: false,
      custom_fields: [],
    })
  );

  const sizes = [
    { name: "Mini Bolo", servings: "5-8 pessoas", weightKg: 1.0, basePrice: 89.90, maxFillings: 1, sortOrder: 0 },
    { name: "Pequeno", servings: "10-15 pessoas", weightKg: 1.5, basePrice: 139.90, maxFillings: 2, sortOrder: 1 },
    { name: "Médio", servings: "20-25 pessoas", weightKg: 2.5, basePrice: 199.90, maxFillings: 2, sortOrder: 2 },
    { name: "Grande", servings: "30-40 pessoas", weightKg: 3.5, basePrice: 279.90, maxFillings: 3, sortOrder: 3 },
  ];

  const insertSize = db.prepare(`
    INSERT INTO CakeSize (id, tenantId, name, servings, weightKg, basePrice, maxFillings, sortOrder, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const sizeIds = {};
  for (const s of sizes) {
    const id = uuid();
    sizeIds[s.name] = id;
    insertSize.run(id, tenantId, s.name, s.servings, s.weightKg, s.basePrice, s.maxFillings, s.sortOrder);
  }

  const flavors = [
    { name: "Baunilha", type: "MASSA", additionalPrice: 0, isSpecial: 0, imageUrl: "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=300&h=300&fit=crop", sortOrder: 0 },
    { name: "Chocolate", type: "MASSA", additionalPrice: 0, isSpecial: 0, imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&h=300&fit=crop", sortOrder: 1 },
    { name: "Red Velvet", type: "MASSA", additionalPrice: 15, isSpecial: 1, imageUrl: "https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?w=300&h=300&fit=crop", sortOrder: 2 },
    { name: "Cenoura", type: "MASSA", additionalPrice: 0, isSpecial: 0, imageUrl: "https://images.unsplash.com/photo-1621955511667-e2c316e4575d?w=300&h=300&fit=crop", sortOrder: 3 },
    { name: "Brigadeiro", type: "RECHEIO", additionalPrice: 0, isSpecial: 0, imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=300&h=300&fit=crop", sortOrder: 0 },
    { name: "Beijinho", type: "RECHEIO", additionalPrice: 0, isSpecial: 0, imageUrl: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=300&h=300&fit=crop", sortOrder: 1 },
    { name: "Doce de Leite", type: "RECHEIO", additionalPrice: 0, isSpecial: 0, imageUrl: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=300&h=300&fit=crop", sortOrder: 2 },
    { name: "Ninho com Nutella", type: "RECHEIO", additionalPrice: 20, isSpecial: 1, imageUrl: "https://images.unsplash.com/photo-1607920591413-4ec007e70023?w=300&h=300&fit=crop", sortOrder: 3 },
    { name: "Frutas Vermelhas", type: "RECHEIO", additionalPrice: 25, isSpecial: 1, imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&h=300&fit=crop", sortOrder: 4 },
    { name: "Pistache", type: "RECHEIO", additionalPrice: 35, isSpecial: 1, imageUrl: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=300&h=300&fit=crop", sortOrder: 5 },
    { name: "Morango", type: "RECHEIO", additionalPrice: 10, isSpecial: 0, imageUrl: "https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=300&h=300&fit=crop", sortOrder: 6 },
    { name: "Maracujá", type: "RECHEIO", additionalPrice: 10, isSpecial: 0, imageUrl: "https://images.unsplash.com/photo-1546039907-7fa05f864c02?w=300&h=300&fit=crop", sortOrder: 7 },
  ];

  const insertFlavor = db.prepare(`
    INSERT INTO CakeFlavor (id, tenantId, name, type, additionalPrice, isSpecial, imageUrl, active, sortOrder)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);
  const flavorIds = {};
  for (const f of flavors) {
    const id = uuid();
    flavorIds[f.name] = id;
    insertFlavor.run(id, tenantId, f.name, f.type, f.additionalPrice, f.isSpecial, f.imageUrl, f.sortOrder);
  }

  const addons = [
    { name: "Topo de Bolo Personalizado", description: "Topo em acrílico com nome e idade", price: 35, imageUrl: "https://images.unsplash.com/photo-1535254973040-607b474cb50d?w=300&h=300&fit=crop", sortOrder: 0 },
    { name: "Caixa de Brigadeiros (25 un.)", description: "Brigadeiros gourmet sortidos", price: 65, imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=300&h=300&fit=crop", sortOrder: 1 },
    { name: "Caixa de Bem-Casados (20 un.)", description: "Bem-casados tradicionais embalados", price: 80, imageUrl: "https://images.unsplash.com/photo-1558301211-0d8c8ddee6ec?w=300&h=300&fit=crop", sortOrder: 2 },
    { name: "Cupcakes Decorados (12 un.)", description: "Cupcakes temáticos com cobertura", price: 55, imageUrl: "https://images.unsplash.com/photo-1587668178277-295251f900ce?w=300&h=300&fit=crop", sortOrder: 3 },
    { name: "Embalagem Premium", description: "Caixa decorativa com laço de fita", price: 25, imageUrl: "https://images.unsplash.com/photo-1549488344-cbb6c34cf1ac?w=300&h=300&fit=crop", sortOrder: 4 },
    { name: "Velas Personalizadas", description: "Kit de velas com número da idade", price: 15, imageUrl: "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=300&h=300&fit=crop", sortOrder: 5 },
  ];

  const insertAddon = db.prepare(`
    INSERT INTO Addon (id, tenantId, name, description, price, imageUrl, active, sortOrder)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `);
  for (const a of addons) {
    insertAddon.run(uuid(), tenantId, a.name, a.description, a.price, a.imageUrl, a.sortOrder);
  }

  const weekdays = [
    { dayOfWeek: 0, isOpen: 0 },
    { dayOfWeek: 1, isOpen: 1 },
    { dayOfWeek: 2, isOpen: 1 },
    { dayOfWeek: 3, isOpen: 1 },
    { dayOfWeek: 4, isOpen: 1 },
    { dayOfWeek: 5, isOpen: 1 },
    { dayOfWeek: 6, isOpen: 1 },
  ];

  const insertSchedule = db.prepare(`
    INSERT INTO WorkSchedule (id, tenantId, dayOfWeek, isOpen)
    VALUES (?, ?, ?, ?)
  `);
  for (const w of weekdays) {
    insertSchedule.run(uuid(), tenantId, w.dayOfWeek, w.isOpen);
  }

  const today = new Date();
  const dateStr = (offsetDays) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offsetDays);
    return d.toISOString().split("T")[0];
  };

  const blockedDates = [dateStr(3), dateStr(7), dateStr(14)];
  const insertBlocked = db.prepare(`
    INSERT INTO BlockedDate (id, tenantId, date, reason)
    VALUES (?, ?, ?, ?)
  `);
  for (const d of blockedDates) {
    insertBlocked.run(uuid(), tenantId, d, "Agenda Lotada");
  }

  // Seed Mock Orders into [Order] table
  const insertOrder = db.prepare(`
    INSERT INTO [Order] (id, tenantId, customerName, customerPhone, eventDate, cakeSizeId, flavorId, fillingIds, addonIds, referenceImageUrl, cakeMessage, details, subtotal, depositAmount, depositMode, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const mockOrders = [
    {
      name: "Juliana Costa",
      phone: "11988776655",
      eventDate: dateStr(2),
      sizeId: sizeIds["Médio"],
      flavorId: flavorIds["Red Velvet"],
      fillings: JSON.stringify([flavorIds["Ninho com Nutella"]]),
      addons: JSON.stringify([]),
      msg: "Parabéns Ju 30 Anos",
      details: "Bolo com acabamento espatulado floral",
      subtotal: 234.90,
      deposit: 117.45,
      status: "pending",
    },
    {
      name: "Mariana Silva",
      phone: "11998877665",
      eventDate: dateStr(4),
      sizeId: sizeIds["Pequeno"],
      flavorId: flavorIds["Baunilha"],
      fillings: JSON.stringify([flavorIds["Brigadeiro"]]),
      addons: JSON.stringify([]),
      msg: "Festa da Mari",
      details: "Laço rosa de fita na embalagem",
      subtotal: 139.90,
      deposit: 69.95,
      status: "approved",
    },
    {
      name: "Lucas Andrade",
      phone: "11977665544",
      eventDate: dateStr(5),
      sizeId: sizeIds["Grande"],
      flavorId: flavorIds["Chocolate"],
      fillings: JSON.stringify([flavorIds["Frutas Vermelhas"]]),
      addons: JSON.stringify([]),
      msg: "Festa de 1 Aninho",
      details: "Decoração temática safari",
      subtotal: 304.90,
      deposit: 152.45,
      status: "in_production",
    },
    {
      name: "Camila Rodrigues",
      phone: "11966554433",
      eventDate: dateStr(1),
      sizeId: sizeIds["Mini Bolo"],
      flavorId: flavorIds["Baunilha"],
      fillings: JSON.stringify([flavorIds["Doce de Leite"]]),
      addons: JSON.stringify([]),
      msg: "Com Carinho",
      details: "Entregar até às 14h",
      subtotal: 89.90,
      deposit: 44.95,
      status: "ready",
    },
    {
      name: "Fernanda Oliveira",
      phone: "11955443322",
      eventDate: dateStr(-1),
      sizeId: sizeIds["Médio"],
      flavorId: flavorIds["Red Velvet"],
      fillings: JSON.stringify([flavorIds["Pistache"]]),
      addons: JSON.stringify([]),
      msg: "Casamento Fernanda & Thiago",
      details: "Bolo de 2 andares decorado",
      subtotal: 269.90,
      deposit: 134.95,
      status: "delivered",
    },
  ];

  for (const o of mockOrders) {
    insertOrder.run(
      uuid(),
      tenantId,
      o.name,
      o.phone,
      o.eventDate,
      o.sizeId,
      o.flavorId,
      o.fillings,
      o.addons,
      "",
      o.msg,
      o.details,
      o.subtotal,
      o.deposit,
      "50_percent",
      o.status
    );
  }

  console.log("[SUCCESS] Seed completed. Demo tenant and mock orders created:");
  console.log("  Name: Doce Arte Confeitaria");
  console.log("  Slug: doce-arte");
  console.log("  Admin Password: admin123");
  console.log("  URL: http://localhost:3000/doce-arte");
}

main();
db.close();
