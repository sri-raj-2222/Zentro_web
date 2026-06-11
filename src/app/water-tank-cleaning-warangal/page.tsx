import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: "Water Tank Cleaning Service in Warangal | Zentro",
  description:
    "Overhead & underground sump cleaning in Warangal, Hanamkonda & Kazipet. Safe, affordable & professional water tank cleaning at your doorstep. Book now!",
  keywords: [
    "water tank cleaning Warangal",
    "water tank cleaning near me",
    "overhead tank cleaning Warangal",
    "underground sump cleaning Warangal",
    "water tank cleaning Hanamkonda",
    "sump cleaning Kazipet",
    "water tank disinfection service",
    "tank cleaning service at home",
    "Zentro water tank cleaning",
  ],
};

export default function WaterTankWarangal() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Water Tank Cleaning in Warangal</h1>
      <p className="mt-4 text-lg">Zentro offers professional water tank cleaning services in Warangal. Safe, clean and affordable!</p>
      <h2 className="text-2xl font-bold mt-6">Why Choose Zentro?</h2>
      <ul className="mt-4 list-disc pl-6">
        <li>Professional Cleaning</li>
        <li>Safe Chemicals Used</li>
        <li>Affordable Pricing</li>
        <li>Doorstep Service</li>
      </ul>
      <Link href="/book" className="mt-8 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg">Book Now</Link>
    </div>
  )
}