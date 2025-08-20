import App from "~/app";
import db from "~/db";
import Response from "~/utils/response";
import { z } from "zod";
import { generateToken, sha256Hex } from "~/utils/crypto";

const createSchema = z.object({
  displayName: z.string().min(1),
  attributes: z.record(z.any()).default({}),
});

const generateSchema = z.object({
  // Only need display name for new cards
  displayName: z.string().min(1, "Display name is required"),
  // Optional additional attributes
  attributes: z.record(z.any()).default({})
});

// Helpers for computing deterministic member info
const buildMemberId = (userId: number, createdAt: Date): string => {
  const year = createdAt.getUTCFullYear();
  const month = String(createdAt.getUTCMonth() + 1).padStart(2, "0");
  return `LEA-${userId}-${year}${month}`;
};

const addOneYear = (d: Date): Date => {
  const nd = new Date(d);
  nd.setUTCFullYear(nd.getUTCFullYear() + 1);
  return nd;
};

const Router = App.basePath("/id-card");

// POST /api/id-card
Router.post("/", async (c) => {
  try {
    const payload = c.get("jwtPayload") as { data?: { id?: number } };
    const userId = payload?.data?.id;
    if (!userId) return new Response(c).error("Unauthorized", 401);
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return new Response(c).error("Invalid JSON body", 400 as any);
    }
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return new Response(c).error(parsed.error);
    const created = await db(c.env).idCards.create({
      data: {
        userId,
        displayName: parsed.data.displayName,
        attributes: parsed.data.attributes,
      },
      select: { id: true, displayName: true, attributes: true },
    });
    return new Response(c).success(created, 201 as any);
  } catch (error: any) {
    if (c.env?.DEV_MODE === "true") {
      return new Response(c).error({ name: error?.name, message: String(error?.message ?? error) }, 500 as any);
    }
    return new Response(c).error("Internal Server Error", 500 as any);
  }
});

// POST /api/id-card/generate
Router.post("/generate", async (c) => {
  const payload = c.get("jwtPayload") as { data?: { id?: number } };
  const userId = payload?.data?.id;
  if (!userId) return new Response(c).error("Unauthorized", 401);
  
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return new Response(c).error("Invalid JSON body", 400 as any);
  }
  
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) return new Response(c).error(parsed.error);

  try {
    // Create a new card with the provided display name
    const card = await db(c.env).idCards.create({
      data: {
        userId,
        displayName: parsed.data.displayName,
        attributes: parsed.data.attributes,
      },
      select: { 
        id: true, 
        displayName: true,
        memberSince: true,
        dateOfGeneration: true,
        validUntil: true,
        memberId: true,
      },
    });

    // Get user data for generation
    const user = await db(c.env).users.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!user) return new Response(c).error("User not found", 404 as any);

    // Generate card details
    const now = new Date();
    const validUntil = new Date(now);
    validUntil.setFullYear(now.getFullYear() + 1);
    const memberId = `LEA-${userId}-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    // Update card with generated details if they don't exist
    if (!card.memberSince || !card.dateOfGeneration || !card.validUntil || !card.memberId) {
      await db(c.env).idCards.update({
        where: { id: card.id },
        data: {
          memberSince: user.createdAt,
          dateOfGeneration: now,
          validUntil,
          memberId,
        },
      });
    }

    // Generate verification token
    const token = await generateToken(24);
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store the verification token
    await db(c.env).tokens.create({
      data: {
        tokenHash: tokenHash,
        type: "idcard",
        userId,
        expiresAt,
        // Store cardId in metadata if needed, or we'll look it up by userId later
      },
    });

    // Return the generated card details
    return new Response(c).success({
      id: card.id,
      displayName: card.displayName,
      memberId: memberId,
      memberSince: user.createdAt.toISOString(),
      dateOfGeneration: now.toISOString(),
      validUntil: validUntil.toISOString(),
      token,
      tokenExpiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    if (c.env?.DEV_MODE === "true") {
      return new Response(c).error({ 
        name: error?.name, 
        message: String(error?.message ?? error) 
      }, 500 as any);
    }
    return new Response(c).error("Internal Server Error", 500 as any);
  }
});

// GET /api/id-card/verify/:token
Router.get("/verify/:token", async (c) => {
  const token = c.req.param("token");
  if (!token) return new Response(c).error("Missing token", 400 as any);
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const rec = await db(c.env).tokens.findFirst({
    where: { type: "idcard", tokenHash, usedAt: null },
  });
  if (!rec || rec.expiresAt < now) {
    return new Response(c).error("Token expired or invalid", 410 as any);
  }
  const [card, user] = await Promise.all([
    db(c.env).idCards.findFirst({
      where: { userId: rec.userId },
      select: {
        id: true,
        memberSince: true,
        dateOfGeneration: true,
        validUntil: true,
        memberId: true,
      },
    }),
    db(c.env).users.findUnique({
      where: { id: rec.userId },
      select: { id: true, name: true, email: true, createdAt: true },
    }),
  ]);
  if (!user) return new Response(c).error("User not found", 404 as any);

  // Mark token as used (single-use)
  await db(c.env).tokens.updateMany({
    where: { id: rec.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  // If fields missing on card, compute on the fly for response
  const memberSince = card?.memberSince ?? user.createdAt;
  const dateOfGeneration = card?.dateOfGeneration ?? now;
  const validUntil = card?.validUntil ?? addOneYear(dateOfGeneration);
  const memberId = card?.memberId ?? buildMemberId(user.id, user.createdAt);

  return new Response(c).success({
    valid: true,
    cardId: String(card?.id ?? ""),
    name: user.name,
    email: user.email,
    memberSince: memberSince.toISOString(),
    dateOfGeneration: dateOfGeneration.toISOString(),
    validUntil: validUntil.toISOString(),
    memberId,
  });
});

// GET /api/id-card/:id/image
Router.get("/:id/image", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return new Response(c).error("Invalid id", 400 as any);
  const card = await db(c.env).idCards.findUnique({ where: { id }, select: { imageUrl: true } });
  if (!card) return new Response(c).error("Not found", 404 as any);
  if (card.imageUrl) return new Response(c).success({ url: card.imageUrl });
  return new Response(c).error("No image available", 404 as any);
});

// GET /api/id-card -> latest active card + recent logs
Router.get("/", async (c) => {
  const payload = c.get("jwtPayload") as { data?: { id?: number } };
  const userId = payload?.data?.id;
  if (!userId) return new Response(c).error("Unauthorized", 401);

  const card = await db(c.env).idCards.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, imageUrl: true },
  });
  if (!card) return new Response(c).success(null);

  const user = await db(c.env).users.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });

  const now = new Date();
  const activeToken = await db(c.env).tokens.findFirst({
    where: { userId, type: "idcard", usedAt: null, expiresAt: { gt: now } },
    orderBy: { expiresAt: "desc" },
    select: { expiresAt: true },
  });
  const recent = await db(c.env).tokens.findMany({
    where: { userId, type: "idcard", NOT: { usedAt: null } },
    orderBy: { usedAt: "desc" },
    take: 5,
    select: { usedAt: true },
  });

  const result = {
    id: String(card.id),
    expiresAt: activeToken?.expiresAt?.toISOString() ?? null,
    status: "active" as const,
    imageUrl: `/api/id-card/${card.id}/image`,
    user: {
      id: String(user?.id ?? ""),
      name: user?.name ?? "",
      email: user?.email ?? "",
      image: null as unknown as string | null,
      role: user?.role ?? "USER",
    },
    recentVerifications: recent.map((r) => ({
      status: "success" as const,
      verifiedAt: r.usedAt ? new Date(r.usedAt).toISOString() : null,
      ipAddress: null as unknown as string | null,
    })),
    previewUrl: `/api/id-card/preview`,
  };

  return new Response(c).success(result);
});

// GET /api/id-card/list -> paginated list
Router.get("/list", async (c) => {
  const payload = c.get("jwtPayload") as { data?: { id?: number } };
  const userId = payload?.data?.id;
  if (!userId) return new Response(c).error("Unauthorized", 401);
  const page = Number(new URL(c.req.url).searchParams.get("page") ?? 1);
  const pageSize = Number(new URL(c.req.url).searchParams.get("pageSize") ?? 10);
  const take = Math.max(1, Math.min(100, pageSize));
  const skip = (Math.max(1, page) - 1) * take;
  const [items, total] = await Promise.all([
    db(c.env).idCards.findMany({ where: { userId }, skip, take, select: { id: true, displayName: true, attributes: true } }),
    db(c.env).idCards.count({ where: { userId } }),
  ]);
  return new Response(c).success({ items, total, page, pageSize: take });
});

// GET /api/id-cards/:id
Router.get("/:id", async (c) => {
  const payload = c.get("jwtPayload") as { data?: { id?: number } };
  const userId = payload?.data?.id;
  if (!userId) return new Response(c).error("Unauthorized", 401);

  const id = c.req.param("id");
  if (!id) return new Response(c).error("ID is required", 400 as any);

  try {
    const card = await db(c.env).idCards.findFirst({
      where: { 
        id: Number(id),
        userId, // Ensure the card belongs to the requesting user
      },
      select: {
        id: true,
        displayName: true,
        memberSince: true,
        dateOfGeneration: true,
        validUntil: true,
        memberId: true,
      },
    });

    if (!card) {
      return new Response(c).error("Card not found", 404 as any);
    }

    // Generate a new verification token
    const token = await generateToken(24);
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store the verification token
    await db(c.env).tokens.create({
      data: {
        tokenHash,
        type: "idcard",
        userId,
        expiresAt,
      },
    });

    return new Response(c).success({
      id: card.id,
      displayName: card.displayName,
      memberId: card.memberId || "",
      memberSince: card.memberSince?.toISOString() || "",
      dateOfGeneration: card.dateOfGeneration?.toISOString() || "",
      validUntil: card.validUntil?.toISOString() || "",
      token,
      tokenExpiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    if (c.env?.DEV_MODE === "true") {
      return new Response(c).error({ 
        name: error?.name, 
        message: String(error?.message ?? error) 
      }, 500 as any);
    }
    return new Response(c).error("Internal Server Error", 500 as any);
  }
});

const IdCardController = Router;
export default IdCardController;
