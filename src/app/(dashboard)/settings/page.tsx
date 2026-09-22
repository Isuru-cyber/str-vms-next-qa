import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isAdmin } from "@/lib/permission-utils";
import { SettingsHub } from "@/components/settings/SettingsHub";

export default async function SettingsPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  if (!isAdmin(user) && !can(user, "manage_users") && !can(user, "manage_system_settings")) {
    redirect("/");
  }

  let users: any[] = [];
  try {
    users = await prisma.user.findMany({
      select: {
        id: true,
        userCode: true,
        name: true,
        email: true,
        roleId: true,
        themePreference: true,
        sidebarHiddenItems: true,
        active: true,
        mustChangePassword: true,
        createdAt: true,
        role: true,
        plants: { include: { plant: true } },
        permissions: true,
      },
      orderBy: { id: "asc" },
    });
  } catch (e) {
    users = [];
  }

  let activityLogs: any[] = [];
  try {
    activityLogs = await prisma.activityLog.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, roleId: true } },
      },
    });
  } catch (e) {
    activityLogs = [];
  }

  let mailTemplates: any[] = [];
  try {
    mailTemplates = await prisma.mailTemplate.findMany({
      orderBy: { id: "asc" },
    });
  } catch (e) {
    mailTemplates = [];
  }

  let systemSettings: any[] = [];
  try {
    systemSettings = await prisma.systemSetting.findMany({
      orderBy: { id: "asc" },
    });
  } catch (e) {
    systemSettings = [];
  }

  let roles: any[] = [];
  try {
    roles = await prisma.role.findMany({
      orderBy: { id: "asc" },
    });
  } catch (e) {
    roles = [];
  }

  let plants: any[] = [];
  try {
    plants = await prisma.plant.findMany({
      orderBy: { sortOrder: "asc" },
    });
  } catch (e) {
    plants = [];
  }

  return (
    <SettingsHub
      initialUsers={JSON.parse(JSON.stringify(users))}
      initialLogs={JSON.parse(JSON.stringify(activityLogs))}
      initialTemplates={JSON.parse(JSON.stringify(mailTemplates))}
      initialSettings={JSON.parse(JSON.stringify(systemSettings))}
      roles={JSON.parse(JSON.stringify(roles))}
      plants={JSON.parse(JSON.stringify(plants))}
    />
  );
}
