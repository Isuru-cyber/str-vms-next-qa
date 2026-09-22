"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Truck, ShieldCheck, Lock, Mail, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Interactive Transport & Logistics Particle Network Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    const mouse = { x: -1000, y: -1000, radius: 160 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    // Logistics Network Nodes (Hubs & Vehicles)
    const particleCount = Math.min(Math.floor((width * height) / 13000), 75);
    const maxConnectionDistance = 145;

    interface NodeParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      baseAlpha: number;
      isHub: boolean;
      pulsePhase: number;
    }

    interface TransitPacket {
      fromIdx: number;
      toIdx: number;
      progress: number;
      speed: number;
    }

    const particles: NodeParticle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const isHub = i % 7 === 0; // Every 7th node is a major logistics hub
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (isHub ? 0.35 : 0.65),
        vy: (Math.random() - 0.5) * (isHub ? 0.35 : 0.65),
        radius: isHub ? Math.random() * 1.5 + 2.5 : Math.random() * 1.2 + 1.2,
        baseAlpha: isHub ? 0.85 : Math.random() * 0.4 + 0.3,
        isHub,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    // Transit Packets simulating cargo in-flight across corridors
    const transitPackets: TransitPacket[] = [];
    for (let p = 0; p < 8; p++) {
      const from = Math.floor(Math.random() * particleCount);
      let to = Math.floor(Math.random() * particleCount);
      while (to === from) to = Math.floor(Math.random() * particleCount);
      transitPackets.push({
        fromIdx: from,
        toIdx: to,
        progress: Math.random(),
        speed: Math.random() * 0.008 + 0.004,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Update and draw nodes (Logistics hubs)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges smoothly
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        p.pulsePhase += 0.03;

        // Mouse avoidance/attraction
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          p.x -= (dx / dist) * force * 1.5;
          p.y -= (dy / dist) * force * 1.5;
        }

        // Draw node
        ctx.beginPath();
        const pulse = p.isHub ? Math.sin(p.pulsePhase) * 0.8 : 0;
        ctx.arc(p.x, p.y, Math.max(1, p.radius + pulse), 0, Math.PI * 2);

        if (p.isHub) {
          // Glow around major logistics hubs
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
          gradient.addColorStop(0, "rgba(99, 102, 241, 0.9)");
          gradient.addColorStop(0.5, "rgba(79, 70, 229, 0.4)");
          gradient.addColorStop(1, "rgba(67, 56, 202, 0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#A5B4FC";
        } else {
          ctx.fillStyle = `rgba(147, 197, 253, ${p.baseAlpha})`;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Connect with nearby nodes (corridors)
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const ndx = p.x - p2.x;
          const ndy = p.y - p2.y;
          const ndist = Math.sqrt(ndx * ndx + ndy * ndy);

          if (ndist < maxConnectionDistance) {
            const alpha = (1 - ndist / maxConnectionDistance) * 0.32;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = p.isHub || p2.isHub
              ? `rgba(129, 140, 248, ${alpha * 1.4})`
              : `rgba(96, 165, 250, ${alpha})`;
            ctx.lineWidth = p.isHub || p2.isHub ? 1.2 : 0.8;
            ctx.stroke();
          }
        }

        // Connect to mouse cursor (Dispatcher active coordinate)
        if (dist < mouse.radius) {
          const mAlpha = (1 - dist / mouse.radius) * 0.45;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(165, 180, 252, ${mAlpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // 2. Draw Moving Transit Cargo Packets
      for (let k = 0; k < transitPackets.length; k++) {
        const tp = transitPackets[k];
        const pA = particles[tp.fromIdx];
        const pB = particles[tp.toIdx];
        if (!pA || !pB) continue;

        const dX = pB.x - pA.x;
        const dY = pB.y - pA.y;
        const dTotal = Math.sqrt(dX * dX + dY * dY);

        if (dTotal < maxConnectionDistance * 1.4) {
          tp.progress += tp.speed;
          if (tp.progress >= 1) {
            tp.progress = 0;
            tp.fromIdx = tp.toIdx;
            tp.toIdx = Math.floor(Math.random() * particles.length);
          }

          const curX = pA.x + dX * tp.progress;
          const curY = pA.y + dY * tp.progress;

          ctx.beginPath();
          ctx.arc(curX, curY, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = "#38BDF8";
          ctx.shadowColor = "#38BDF8";
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // If nodes moved too far apart, re-link to closer pair
          tp.fromIdx = Math.floor(Math.random() * particles.length);
          tp.toIdx = Math.floor(Math.random() * particles.length);
          tp.progress = 0;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid credentials entered.");
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060D1A] via-[#0A1628] to-[#0F1E36] flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Dynamic Logistics Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 pointer-events-auto" />

      {/* Ambient Radial Lighting Blobs */}
      <div className="absolute -top-32 -left-32 w-[32rem] h-[32rem] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[32rem] h-[32rem] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Login Container */}
      <div className="w-full max-w-md z-10 space-y-5">
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-700 text-white shadow-xl shadow-indigo-600/30 border border-indigo-400/20 mb-1.5 transition-transform hover:scale-105 duration-200">
            <Truck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            STR Transport Management
          </h1>
          <p className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
            Vehicle Management System (VMS)
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-7 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_40px_-5px_rgba(79,70,229,0.15)] space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 animate-pulse" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Corporate Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="user@str.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-950/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-950/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 transition cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all duration-150 disabled:opacity-50 cursor-pointer pt-3 pb-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to VMS</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* System Status Footnote */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Operational</span>
            </div>
            <span className="text-[10px] text-slate-500">v2.4.0 (Enterprise)</span>
          </div>
        </div>

        {/* Security Compliance Footer */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>MAS Holdings &bull; STR Logistics IT Security Policy</span>
        </div>
      </div>
    </div>
  );
}

