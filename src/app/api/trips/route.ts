import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi, isAdmin } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "view_trips" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const query = searchParams.get("q");

    const where: any = {};

    if (!isAdmin(user) && user.plantIds && user.plantIds.length > 0) {
      where.tripRequests = {
        some: {
          request: {
            plantId: { in: user.plantIds },
          },
        },
      };
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (query) {
      where.OR = [
        { tripNo: { contains: query, mode: "insensitive" } },
        { vehicle: { vehicleNumber: { contains: query, mode: "insensitive" } } },
        { driver: { name: { contains: query, mode: "insensitive" } } },
      ];
    }

    const limitParam = searchParams.get("limit");
    const pageParam = searchParams.get("page");
    const limit = Math.min(200, Math.max(1, parseInt(limitParam || "50", 10) || 50));
    const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
    const skip = (page - 1) * limit;

    const trips = await prisma.deliveryTrip.findMany({
      where,
      take: limit,
      skip,
      orderBy: { id: "desc" },
      include: {
        vehicle: true,
        driver: true,
        route: true,
        tripRequests: {
          include: {
            request: {
              include: {
                plant: true,
                fromLocation: true,
                toLocation: true,
              },
            },
          },
          orderBy: { loadingSequence: "asc" },
        },
        gatePasses: {
          select: {
            id: true,
            gatePassNo: true,
            status: true,
            createdAt: true,
          },
        },
        reconciliations: {
          select: {
            id: true,
            matchStatus: true,
            gatePassNo: true,
          },
        },
      },
    });

    return NextResponse.json({ status: "success", data: trips, page, limit });
  } catch (error: any) {
    console.error("Fetch trips error:", error);
    return NextResponse.json({ message: "Failed to fetch trips." }, { status: 500 });
  }
}
