"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Clock,
  ArrowRight,
  CheckCircle2,
  Trash2,
  Truck,
  FileText,
  AlertCircle,
  ShieldAlert,
  Search,
} from "lucide-react";

interface NotificationItem {
  id: number;
  userId?: number | null;
  roleTarget?: string | null;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  isRead: number;
  createdAt: string | Date;
}

interface NotificationsHubProps {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
}

export const NotificationsHub: React.FC<NotificationsHubProps> = ({
  initialNotifications,
  initialUnreadCount,
}) => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "TRIPS" | "REQUESTS">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const formatTimeAgo = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
    if (diffSec < 172800) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case "TRIP_DISPATCHED":
      case "TRIP":
      case "ALLOCATION":
        return <Truck className="w-4 h-4 text-indigo-600" />;
      case "REQUEST_CREATED":
      case "REQUEST_CANCELLED":
      case "REQUEST":
        return <FileText className="w-4 h-4 text-emerald-600" />;
      case "SECURITY":
      case "ALERT":
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-blue-600" />;
    }
  };

  const handleMarkAllRead = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
        setUnreadCount(0);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: 1 } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleClearRead = async () => {
    if (!confirm("Are you sure you want to clear all read notifications?")) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications", { method: "DELETE" });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.isRead === 0));
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to clear read notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = notifications.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === "UNREAD") return n.isRead === 0;
    if (filter === "TRIPS")
      return (
        n.type.includes("TRIP") ||
        n.type.includes("ALLOCATION") ||
        n.title.toLowerCase().includes("trip")
      );
    if (filter === "REQUESTS")
      return (
        n.type.includes("REQUEST") || n.title.toLowerCase().includes("request")
      );
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Bell className="w-4 h-4" />
          </div>
          <h1 className="text-base font-bold text-gray-900 tracking-tight">
            Notifications Center
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}

          <button
            onClick={handleClearRead}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 text-xs font-semibold border border-gray-200 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-gray-400" />
            <span>Clear read</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-hidden focus:border-indigo-600 bg-gray-50/50"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              filter === "ALL"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("UNREAD")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
              filter === "UNREAD"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter("TRIPS")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              filter === "TRIPS"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Trips & Allocations
          </button>
          <button
            onClick={() => setFilter("REQUESTS")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              filter === "REQUESTS"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Cargo Requests
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs divide-y divide-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-xs">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No notifications match your current view.</p>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                n.isRead === 0 ? "bg-indigo-50/20 hover:bg-indigo-50/40" : "hover:bg-gray-50/60"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                    n.isRead === 0
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-500/10"
                      : "bg-gray-50 border-gray-200 text-gray-500"
                  }`}
                >
                  {getIcon(n.type)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-gray-900 leading-snug">
                      {n.title}
                    </h3>
                    {n.isRead === 0 && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed max-w-xl">
                    {n.message}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 tabular-nums font-medium pt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(n.createdAt)}</span>
                    <span>•</span>
                    <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 pt-1">
                {n.isRead === 0 && (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors text-xs font-semibold cursor-pointer"
                    title="Mark as read"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}

                {n.linkUrl && (
                  <Link
                    href={n.linkUrl}
                    onClick={() => {
                      if (n.isRead === 0) handleMarkAsRead(n.id);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 transition-colors"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
