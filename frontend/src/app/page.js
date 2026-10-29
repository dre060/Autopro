// frontend/src/app/page.js — 2026 refresh (hero kept, motion + Tacoma spotlight added)
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Reveal, GaugeStat } from "@/components/Motion";
import { localVehicles } from "@/data/localInventory";

const PHONE_DISPLAY = "(352) 933-5181";
const PHONE_TEL = "3529335181";

const spotlight = localVehicles.find((v) => v.spotlight);

export default function Home() {
  const [selectedYear, setSelectedYear] = useState("All Years");
  const [selectedMake, setSelectedMake] = useState("All Makes");
  const [selectedModel, setSelectedModel] = useState("All Models");
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/vehicles?status=available");
        if (res.ok) {
          const data = await res.json();
          setInventory(data.vehicles || []);
        }
      } catch (e) {
        console.error("Error fetching vehicles:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Search options come from what's actually on the lot.
  const years = useMemo(() => [...new Set(inventory.map((v) => v.year))].filter(Boolean).sort((a, b) => b - a), [inventory]);
  const makes = useMemo(() => [...new Set(inventory.map((v) => v.make))].filter(Boolean).sort(), [inventory]);
  const models = useMemo(
    () => [...new Set(inventory.filter((v) => selectedMake === "All Makes" || v.make === selectedMake).map((v) => v.model))].filter(Boolean).sort(),
    [inventory, selectedMake]
  );

  const featured = inventory.filter((v) => v.featured && v.id !== spotlight?.id).slice(0, 3);
  const moreVehicles = featured.length > 0 ? featured : inventory.filter((v) => v.id !== spotlight?.id).slice(0, 3);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedYear !== "All Years") params.append("year", selectedYear);
    if (selectedMake !== "All Makes") params.append("make", selectedMake);
    if (selectedModel !== "All Models") params.append("model", selectedModel);
    window.location.href = `/inventory?${params.toString()}`;
  };

  return (
    <>
      {/* ================= HERO (kept, refreshed) ================= */}
      <section className="relative min-h-[100svh] w-full flex items-center overflow-hidden">
        <div className="absolute inset-0 hero-media">
          <Image src="/hero.jpg" alt="Technician tightening lug nuts at the Auto Pro shop" fill className="object-cover" priority sizes="100vw" />
        </div>
        <div className="absolute inset-0 hero-shade" />
        <div className="absolute inset-0 hero-speedlines pointer-events-none" aria-hidden="true">
          <span /><span /><span />
        </div>

        <div className="relative z-10 w-full flex flex-col justify-center items-center text-center px-4 pt-28 pb-48 md:pb-40">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-5 max-w-5xl">
            <span className="hero-line">Trusted Auto Repair&nbsp;&amp;</span>
            <span className="hero-line">Vehicle Sales in Leesburg, FL</span>
          </h1>
          <p className="hero-rise text-lg sm:text-xl md:text-2xl mb-9 text-gray-200" style={{ "--d": "0.35s" }}>
            Affordable. Honest. Done right the first time.
          </p>

          <div className="hero-rise flex flex-col sm:flex-row gap-3 w-full max-w-md sm:max-w-none sm:w-auto" style={{ "--d": "0.5s" }}>
            <Link href="/appointment" className="ap-btn ap-btn--primary">Book an appointment</Link>
            <a href={`tel:${PHONE_TEL}`} className="ap-btn ap-btn--light">Call {PHONE_DISPLAY}</a>
          </div>

          <Link
            href="/specials"
            className="hero-rise mt-8 inline-flex items-center gap-2 rounded-full border border-yellow-400/60 bg-yellow-400/10 px-5 py-2 text-sm sm:text-base font-semibold text-yellow-300 hover:bg-yellow-400 hover:text-black transition-colors"
            style={{ "--d": "0.65s" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-300" />
            </span>
            See this month&apos;s service specials
          </Link>
        </div>

        <div className="hidden md:flex absolute bottom-32 left-1/2 -translate-x-1/2 z-10 hero-rise" style={{ "--d": "1s" }} aria-hidden="true">
          <div className="scroll-cue" />
        </div>

        {/* Vehicle search dock */}
        <div className="absolute bottom-0 left-0 right-0 z-10 search-dock py-4 md:py-5">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-center items-stretch md:items-center gap-3">
              <label className="sr-only" htmlFor="s-year">Year</label>
              <select id="s-year" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="md:min-w-[150px]">
                <option>All Years</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <label className="sr-only" htmlFor="s-make">Make</label>
              <select id="s-make" value={selectedMake} onChange={(e) => { setSelectedMake(e.target.value); setSelectedModel("All Models"); }} className="md:min-w-[150px]">
                <option>All Makes</option>
                {makes.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <label className="sr-only" htmlFor="s-model">Model</label>
              <select id="s-model" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="md:min-w-[150px]">
                <option>All Models</option>
                {models.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <button onClick={handleSearch} className="ap-btn ap-btn--primary !py-3">Search inventory</button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= WHY US — gauge cluster ================= */}
      <section className="py-16 md:py-24 px-4 bg-black">
        <div className="container mx-auto max-w-6xl grid md:grid-cols-[1fr_1.3fr] gap-12 items-center">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-bold mb-5">Family-owned, and it shows.</h2>
            <p className="text-gray-300 text-base md:text-lg max-w-prose">
              We&apos;re a family business on Hood Ave serving Leesburg and Lake County. Whether you need a repair,
              an oil change, a tow, or your next vehicle, you deal with the people who do the work.
            </p>
          </Reveal>
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            <GaugeStat value="ASE" label="Certified technicians" fill={1} />
            <GaugeStat value="20+" label="Years of experience" fill={0.85} delay={150} />
            <GaugeStat value="24/7" label="Towing, day or night" fill={1} red delay={300} />
          </div>
        </div>
      </section>

      {/* ================= JUST ARRIVED — Tacoma spotlight ================= */}
      {spotlight && <Spotlight vehicle={spotlight} />}

      {/* ================= MORE INVENTORY ================= */}
      <section className="py-16 md:py-24 px-4 bg-[#0d0f13]">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-wrap justify-between items-end gap-4 mb-10">
            <Reveal as="h2" className="text-3xl md:text-4xl font-bold">More on the lot</Reveal>
            <Link href="/inventory" className="nav-link text-sm md:text-base">View all inventory</Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => <div key={i} className="h-80 rounded-lg skeleton" />)}
            </div>
          ) : moreVehicles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {moreVehicles.map((v, i) => (
                <Reveal key={v.id} delay={i * 100}>
                  <VehicleCard vehicle={v} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 p-10 text-center">
              <p className="text-gray-300 mb-5">New arrivals are being added. Call us to ask what&apos;s coming in.</p>
              <a href={`tel:${PHONE_TEL}`} className="ap-btn ap-btn--primary">Call {PHONE_DISPLAY}</a>
            </div>
          )}
        </div>
      </section>

      {/* ================= SERVICES ================= */}
      <section className="py-16 md:py-24 px-4 bg-black">
        <div className="container mx-auto max-w-6xl">
          <Reveal as="h2" className="text-3xl md:text-4xl font-bold mb-12">What we do</Reveal>
          <div className="grid md:grid-cols-3 gap-px bg-white/10 rounded-lg overflow-hidden">
            {[
              { title: "Auto repair", body: "Engine, brakes, suspension, electrical and diagnostics, handled by ASE-certified technicians.", href: "/services", cta: "See repair services", icon: <IconWrench /> },
              { title: "Maintenance", body: "Oil changes, fluids, filters and inspections that keep small problems from becoming big ones.", href: "/services", cta: "See maintenance", icon: <IconDrop /> },
              { title: "24/7 towing", body: "Broken down anywhere around Leesburg? Call and we'll come get you, any hour.", href: `tel:${PHONE_TEL}`, cta: "Call for a tow", icon: <IconTruck />, tel: true },
            ].map((s, i) => (
              <Reveal key={s.title} delay={i * 120} className="bg-black p-8 md:p-10 group">
                <div className="w-12 h-12 mb-6 text-[var(--ap-glow)] transition-transform duration-500 group-hover:-translate-y-1">{s.icon}</div>
                <h3 className="text-2xl font-bold mb-3">{s.title}</h3>
                <p className="text-gray-400 mb-6">{s.body}</p>
                {s.tel ? (
                  <a href={s.href} className="nav-link text-sm">{s.cta}</a>
                ) : (
                  <Link href={s.href} className="nav-link text-sm">{s.cta}</Link>
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FINANCING ================= */}
      <section className="relative py-16 md:py-20 px-4 overflow-hidden bg-gradient-to-r from-[#0a3d91] via-[#1554c8] to-[#0a3d91]">
        <div className="container mx-auto max-w-5xl relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Financing for every credit situation</h2>
            <p className="text-blue-100 text-lg max-w-xl">Low down payments and flexible terms. Ask us about options on any vehicle.</p>
          </Reveal>
          <Link href="/contact" className="ap-btn ap-btn--light shrink-0">Ask about financing</Link>
        </div>
      </section>

      {/* ================= TESTIMONIAL + CTA ================= */}
      <section className="py-20 md:py-28 px-4 bg-black">
        <div className="container mx-auto max-w-4xl text-center">
          <Reveal>
            <div className="flex justify-center gap-1 mb-6 text-yellow-400" aria-label="5 out of 5 stars">
              {[0, 1, 2, 3, 4].map((i) => (
                <svg key={i} className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.26 3.88a1 1 0 00.95.69h4.08c.97 0 1.37 1.24.59 1.81l-3.3 2.4a1 1 0 00-.36 1.12l1.26 3.88c.3.92-.76 1.69-1.54 1.12l-3.3-2.4a1 1 0 00-1.18 0l-3.3 2.4c-.78.57-1.84-.2-1.54-1.12l1.26-3.88a1 1 0 00-.36-1.12l-3.3-2.4c-.78-.57-.38-1.81.59-1.81h4.08a1 1 0 00.95-.69l1.26-3.88z" /></svg>
              ))}
            </div>
            <blockquote className="font-display text-2xl md:text-4xl leading-snug mb-5">
              &ldquo;Fast, reliable, and great pricing. Auto Pro is the only place I&apos;ll go.&rdquo;
            </blockquote>
            <p className="text-gray-400">Jessica R., Leesburg, FL</p>
          </Reveal>
          <Reveal delay={150} className="mt-14 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/appointment" className="ap-btn ap-btn--primary">Schedule service</Link>
            <Link href="/inventory" className="ap-btn ap-btn--ghost">Browse vehicles</Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */

function Spotlight({ vehicle }) {
  const [active, setActive] = useState(0);
  const imgs = vehicle.images || [];

  // Gentle auto-advance until the visitor picks a photo themselves.
  const [userPicked, setUserPicked] = useState(false);
  useEffect(() => {
    if (userPicked || imgs.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive((a) => (a + 1) % imgs.length), 4500);
    return () => clearInterval(t);
  }, [userPicked, imgs.length]);

  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const specs = [
    `${vehicle.mileage.toLocaleString()} miles`,
    vehicle.engine,
    vehicle.drivetrain,
    vehicle.exterior_color,
  ].filter(Boolean);

  return (
    <section className="relative py-16 md:py-24 px-4 bg-black overflow-hidden" aria-labelledby="spotlight-title">
      {/* soft green glow picked up from the truck's paint */}
      <div className="pointer-events-none absolute -top-40 right-0 w-[60rem] h-[60rem] rounded-full opacity-25 blur-3xl" style={{ background: "radial-gradient(circle, #3e5a3a 0%, transparent 60%)" }} aria-hidden="true" />
      <div className="container mx-auto max-w-6xl relative grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-16 items-center">
        <Reveal>
          <div className="spot-frame aspect-[4/5] sm:aspect-[5/5] lg:aspect-[4/5]">
            {imgs.map((img, i) => (
              <Image
                key={img.url}
                src={img.url}
                alt={img.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="spot-slide object-cover"
                style={{ opacity: i === active ? 1 : 0, transform: i === active ? "scale(1)" : "scale(1.04)" }}
                priority={i === 0}
              />
            ))}
            <div className="absolute top-4 left-4 rounded-full bg-[var(--ap-redline)] px-3 py-1 text-xs font-bold tracking-wide">Just arrived</div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {imgs.map((img, i) => (
              <button
                key={img.url}
                type="button"
                className="spot-thumb aspect-square"
                aria-pressed={i === active}
                aria-label={`Show photo ${i + 1} of ${imgs.length}`}
                onClick={() => { setActive(i); setUserPicked(true); }}
              >
                <Image src={img.url} alt="" fill sizes="120px" className="object-cover" />
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={150}>
          <h2 id="spotlight-title" className="text-4xl md:text-6xl font-bold leading-[1.02]">
            {title}
          </h2>
          <p className="mt-2 text-xl md:text-2xl text-gray-300 font-display">{vehicle.trim}</p>

          <div className="mt-8 flex items-baseline gap-4">
            <span className="price-tag text-5xl md:text-6xl">${vehicle.price.toLocaleString()}</span>
          </div>
          {vehicle.title_status && (
            <p className="mt-3 text-sm text-amber-300">{vehicle.title_status} title. Ask us about this vehicle&apos;s history.</p>
          )}

          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Key specs">
            {specs.map((s) => (
              <li key={s} className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm">{s}</li>
            ))}
            {vehicle.title_status && (
              <li className="rounded-full border border-amber-400/60 bg-amber-400/10 px-4 py-1.5 text-sm text-amber-300">
                {vehicle.title_status} title
              </li>
            )}
          </ul>

          <p className="mt-6 text-gray-300 max-w-prose">{vehicle.description}</p>

          <ul className="mt-6 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-gray-200">
            {vehicle.features.slice(0, 6).map((f) => (
              <li key={f} className="flex gap-2">
                <svg className="w-5 h-5 mt-0.5 shrink-0 text-[var(--ap-glow)]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.58l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" /></svg>
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <Link href={`/inventory/${vehicle.id}`} className="ap-btn ap-btn--primary">See full details</Link>
            <a href={`tel:${PHONE_TEL}`} className="ap-btn ap-btn--ghost">Call about this truck</a>
            <a href={`sms:${PHONE_TEL}?&body=${encodeURIComponent(`Hi, is the ${title} still available?`)}`} className="ap-btn ap-btn--ghost sm:hidden">Text us</a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function VehicleCard({ vehicle }) {
  const img = (vehicle.images?.find((i) => i.isPrimary) || vehicle.images?.[0])?.url || "/hero.jpg";
  const price = vehicle.sale_price || vehicle.price;
  return (
    <Link href={`/inventory/${vehicle.id}`} className="vcard block h-full">
      <div className="relative h-56 overflow-hidden">
        <Image src={img} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} fill sizes="(max-width: 768px) 100vw, 33vw" className="vcard-img object-cover" />
      </div>
      <div className="p-5">
        <h3 className="text-xl font-bold">{vehicle.year} {vehicle.make} {vehicle.model}</h3>
        {vehicle.trim && <p className="text-sm text-gray-400">{vehicle.trim}</p>}
        <div className="mt-4 flex items-end justify-between">
          <span className="price-tag text-2xl">{price ? `$${price.toLocaleString()}` : "Call for price"}</span>
          {vehicle.mileage ? <span className="text-sm text-gray-400">{vehicle.mileage.toLocaleString()} mi</span> : null}
        </div>
        {vehicle.sale_price ? (
          <p className="mt-1 text-sm text-gray-500 line-through">${vehicle.price?.toLocaleString()}</p>
        ) : null}
        {vehicle.title_status ? (
          <p className="mt-2 text-xs text-amber-300">{vehicle.title_status} title</p>
        ) : null}
      </div>
    </Link>
  );
}

function IconWrench() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full" aria-hidden="true">
      <path d="M14.7 6.3a4 4 0 00-5.4 5.2L3.5 17.3a1.8 1.8 0 002.5 2.5l5.8-5.8a4 4 0 005.2-5.4l-2.6 2.6-2.3-.4-.4-2.3 2.6-2.6z" />
    </svg>
  );
}
function IconDrop() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full" aria-hidden="true">
      <path d="M12 3s6 6.4 6 11a6 6 0 01-12 0c0-4.6 6-11 6-11z" />
      <path d="M9.5 15a2.5 2.5 0 002.5 2.5" />
    </svg>
  );
}
function IconTruck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full" aria-hidden="true">
      <path d="M2 16V6h11v10M13 9h4l4 4v3h-8" />
      <circle cx="6.5" cy="17" r="2" /><circle cx="17.5" cy="17" r="2" />
    </svg>
  );
}
