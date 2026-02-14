import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const demoSlug = "articimento-premium";
  await prisma.tenant.deleteMany({
    where: {
      slug: demoSlug,
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          "root@articimento.local",
          "admin@articimento.local",
          "seller@articimento.local",
          "client@articimento.local",
        ],
      },
    },
  });

  const tenant = await prisma.tenant.create({
    data: {
      name: "Articimento Premium",
      slug: demoSlug,
      whatsappNumber: "+13055550123",
      seoTitle: "Articimento Premium | Condo Sales OS",
      seoDescription: "Demo tenant para ventas de condominios premium con flujo completo.",
      platformFeePct: 2,
      sellerCommissionPct: 3,
      reservationTtlHours: 48,
      domains: {
        create: [
          { host: "localhost", isPrimary: true },
          { host: "127.0.0.1", isPrimary: false },
        ],
      },
    },
  });

  const [rootUser, adminUser, sellerUser, clientUser] = await Promise.all([
    prisma.user.create({
      data: {
        email: "root@articimento.local",
        name: "Root User",
        passwordHash: await hash("root123", 10),
      },
    }),
    prisma.user.create({
      data: {
        email: "admin@articimento.local",
        name: "Admin User",
        passwordHash: await hash("admin123", 10),
      },
    }),
    prisma.user.create({
      data: {
        email: "seller@articimento.local",
        name: "Seller User",
        passwordHash: await hash("seller123", 10),
      },
    }),
    prisma.user.create({
      data: {
        email: "client@articimento.local",
        name: "Client User",
        passwordHash: await hash("client123", 10),
      },
    }),
  ]);

  await prisma.membership.createMany({
    data: [
      { tenantId: tenant.id, userId: rootUser.id, role: "ROOT" },
      { tenantId: tenant.id, userId: adminUser.id, role: "ADMIN" },
      { tenantId: tenant.id, userId: sellerUser.id, role: "SELLER" },
      { tenantId: tenant.id, userId: clientUser.id, role: "CLIENT" },
    ],
  });

  const building = await prisma.building.create({
    data: {
      tenantId: tenant.id,
      name: "Promenade Tower",
      slug: "promenade-tower",
    },
  });

  const tower = await prisma.tower.create({
    data: {
      tenantId: tenant.id,
      buildingId: building.id,
      name: "Tower A",
      code: "TA",
    },
  });

  const floors = await Promise.all(
    Array.from({ length: 10 }).map((_, index) =>
      prisma.floor.create({
        data: {
          tenantId: tenant.id,
          towerId: tower.id,
          number: index + 1,
        },
      }),
    ),
  );

  const [typologyA, typologyB] = await Promise.all([
    prisma.typology.create({
      data: {
        tenantId: tenant.id,
        name: "Aurora 2BR",
        slug: "aurora-2br",
        description: "Tipologia de 2 habitaciones con terraza.",
        areaM2: 98,
        bedrooms: 2,
        bathrooms: 2,
        basePrice: 289000,
      },
    }),
    prisma.typology.create({
      data: {
        tenantId: tenant.id,
        name: "Zenith 3BR",
        slug: "zenith-3br",
        description: "Tipologia de 3 habitaciones con vista panoramica.",
        areaM2: 132,
        bedrooms: 3,
        bathrooms: 3,
        basePrice: 379000,
      },
    }),
  ]);

  await prisma.typologyMedia.createMany({
    data: [
      {
        tenantId: tenant.id,
        typologyId: typologyA.id,
        kind: "render",
        title: "Aurora Render",
        url: "https://example.com/aurora-render.jpg",
      },
      {
        tenantId: tenant.id,
        typologyId: typologyB.id,
        kind: "brochure",
        title: "Zenith Brochure",
        url: "https://example.com/zenith-brochure.pdf",
      },
    ],
  });

  const amenityType = await prisma.amenityType.create({
    data: {
      tenantId: tenant.id,
      name: "Sky Lounge",
      slug: "sky-lounge",
    },
  });

  const amenity = await prisma.amenityInstance.create({
    data: {
      tenantId: tenant.id,
      amenityTypeId: amenityType.id,
      title: "Sky Lounge",
      slug: "sky-lounge",
      description: "Area social con vista 360.",
      dimensionsM2: 240,
    },
  });

  await prisma.amenityMedia.create({
    data: {
      tenantId: tenant.id,
      amenityId: amenity.id,
      mediaType: "image",
      url: "https://example.com/sky-lounge.jpg",
    },
  });

  const unitStatuses = [
    "AVAILABLE",
    "AVAILABLE",
    "AVAILABLE",
    "AVAILABLE",
    "AVAILABLE",
    "RESERVED",
    "AVAILABLE",
    "SOLD",
    "BLOCKED",
    "AVAILABLE",
  ] as const;

  const units = await Promise.all(
    floors.map((floor, index) =>
      prisma.unit.create({
        data: {
          tenantId: tenant.id,
          buildingId: building.id,
          towerId: tower.id,
          floorId: floor.id,
          typologyId: index % 2 === 0 ? typologyA.id : typologyB.id,
          code: `TA-${String(index + 1).padStart(2, "0")}01`,
          slug: `ta-${String(index + 1).padStart(2, "0")}01`,
          areaM2: index % 2 === 0 ? 98 : 132,
          price: index % 2 === 0 ? 289000 + index * 2000 : 379000 + index * 2000,
          view: index % 2 === 0 ? "Garden" : "Ocean",
          status: unitStatuses[index],
        },
      }),
    ),
  );

  const lead = await prisma.lead.create({
    data: {
      tenantId: tenant.id,
      userId: clientUser.id,
      unitId: units[0]?.id,
      fullName: "Client User",
      email: "client@articimento.local",
      phone: "+13055550199",
      status: "QUALIFIED",
      source: "website",
    },
  });

  await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      leadId: lead.id,
      userId: clientUser.id,
      unitId: units[0]?.id,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: "SCHEDULED",
      notes: "Tour presencial",
    },
  });

  const reservation = await prisma.reservation.create({
    data: {
      tenantId: tenant.id,
      unitId: units[5]?.id as string,
      leadId: lead.id,
      userId: clientUser.id,
      expiresAt: new Date(Date.now() + 36 * 60 * 60 * 1000),
      status: "ACTIVE",
      notes: "Reserva inicial demo",
    },
  });

  const sale = await prisma.sale.create({
    data: {
      tenantId: tenant.id,
      unitId: units[7]?.id as string,
      leadId: lead.id,
      buyerId: clientUser.id,
      sellerId: sellerUser.id,
      reservationId: reservation.id,
      price: 389000,
      status: "OPEN",
    },
  });

  const paymentPlan = await prisma.paymentPlan.create({
    data: {
      tenantId: tenant.id,
      saleId: sale.id,
      title: "Plan 12 cuotas",
      totalAmount: 120000,
      startDate: new Date(),
    },
  });

  const installment = await prisma.installment.create({
    data: {
      tenantId: tenant.id,
      paymentPlanId: paymentPlan.id,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      amount: 10000,
    },
  });

  const payment = await prisma.payment.create({
    data: {
      tenantId: tenant.id,
      saleId: sale.id,
      installmentId: installment.id,
      registeredById: adminUser.id,
      amount: 10000,
      method: "bank_transfer",
      reference: "DEMO-TRX-001",
      status: "CONFIRMED",
    },
  });

  await prisma.installment.update({
    where: { id: installment.id },
    data: {
      paidAmount: 10000,
      status: "PAID",
    },
  });

  await prisma.commissionRule.create({
    data: {
      tenantId: tenant.id,
      role: "SELLER",
      percentage: 3,
      active: true,
    },
  });

  await prisma.commissionEntry.create({
    data: {
      tenantId: tenant.id,
      saleId: sale.id,
      sellerId: sellerUser.id,
      percentage: 3,
      amount: 300,
    },
  });

  await prisma.ledgerEntry.createMany({
    data: [
      {
        tenantId: tenant.id,
        saleId: sale.id,
        paymentId: payment.id,
        type: "PAYMENT_RECEIVED",
        amount: 10000,
        notes: "Gross payment",
      },
      {
        tenantId: tenant.id,
        saleId: sale.id,
        paymentId: payment.id,
        type: "PLATFORM_FEE",
        amount: 200,
        notes: "2% platform fee",
      },
      {
        tenantId: tenant.id,
        saleId: sale.id,
        paymentId: payment.id,
        type: "SELLER_COMMISSION",
        amount: 300,
        notes: "3% seller commission",
      },
      {
        tenantId: tenant.id,
        saleId: sale.id,
        paymentId: payment.id,
        type: "NET_TO_PROJECT",
        amount: 9500,
        notes: "Net to project",
      },
    ],
  });

  const ownerAccount = await prisma.ownerAccount.create({
    data: {
      tenantId: tenant.id,
      userId: clientUser.id,
      unitId: units[7]?.id,
      fullName: "Client User",
      email: "client@articimento.local",
    },
  });

  await prisma.unitOwnership.create({
    data: {
      tenantId: tenant.id,
      unitId: units[7]?.id as string,
      ownerAccountId: ownerAccount.id,
      startsAt: new Date(),
      percentage: 100,
    },
  });

  const condoPlan = await prisma.condoFeePlan.create({
    data: {
      tenantId: tenant.id,
      title: "Condo Fee 2026",
      monthlyFee: 350,
      lateFeePct: 5,
      active: true,
    },
  });

  const condoCharge = await prisma.condoFeeCharge.create({
    data: {
      tenantId: tenant.id,
      planId: condoPlan.id,
      unitId: units[7]?.id as string,
      ownerAccountId: ownerAccount.id,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      amount: 350,
      lateFeeAmount: 0,
      status: "PENDING",
    },
  });

  await prisma.condoFeePayment.create({
    data: {
      tenantId: tenant.id,
      chargeId: condoCharge.id,
      amount: 350,
      method: "card",
      reference: "CF-2026-01",
    },
  });

  await prisma.asset.createMany({
    data: [
      {
        tenantId: tenant.id,
        uploadedById: adminUser.id,
        type: "BROCHURE",
        name: "Zenith Brochure.pdf",
        blobPath: `${tenant.id}/brochure-zenith.pdf`,
        blobUrl: "https://example.com/assets/brochure-zenith.pdf",
        typologyId: typologyB.id,
      },
      {
        tenantId: tenant.id,
        uploadedById: adminUser.id,
        type: "CONTRACT",
        name: "Contract Sale TA-0801.pdf",
        blobPath: `${tenant.id}/contract-ta-0801.pdf`,
        blobUrl: "https://example.com/assets/contract-ta-0801.pdf",
        saleId: sale.id,
      },
      {
        tenantId: tenant.id,
        uploadedById: adminUser.id,
        type: "VOUCHER",
        name: "Voucher Payment DEMO-TRX-001.pdf",
        blobPath: `${tenant.id}/voucher-demo-trx-001.pdf`,
        blobUrl: "https://example.com/assets/voucher-demo-trx-001.pdf",
        paymentId: payment.id,
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: adminUser.id,
        action: "seed.completed",
        entityType: "Tenant",
        entityId: tenant.id,
      },
      {
        tenantId: tenant.id,
        userId: adminUser.id,
        action: "ledger.demo.generated",
        entityType: "Payment",
        entityId: payment.id,
      },
    ],
  });

  console.log("Seed completed:");
  console.log(`Tenant: ${tenant.name} (${tenant.id})`);
  console.log("Users:");
  console.log(" - root@articimento.local / root123");
  console.log(" - admin@articimento.local / admin123");
  console.log(" - seller@articimento.local / seller123");
  console.log(" - client@articimento.local / client123");
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

