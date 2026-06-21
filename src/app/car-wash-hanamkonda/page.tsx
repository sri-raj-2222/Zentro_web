import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: "Car Wash in Hanamkonda - Doorstep Service | Zentro",
  description:
    "Professional doorstep car wash service in Hanamkonda. Zentro brings interior & exterior car cleaning & bike wash to your home. Book now!",
  keywords: [
    "car wash Hanamkonda",
    "doorstep car wash Hanamkonda",
    "car wash near me Hanamkonda",
    "car cleaning service Hanamkonda",
    "bike wash Hanamkonda",
    "interior car cleaning Hanamkonda",
    "vehicle cleaning Hanamkonda",
    "car wash at home Hanamkonda",
    "Zentro Hanamkonda",
  ],
};

export default function CarWashHanamkonda() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Car Wash in Hanamkonda</h1>
      <p className="mt-4 text-lg">Zentro offers professional doorstep car wash services in Hanamkonda. We come to your home or office!</p>
      <h2 className="text-2xl font-bold mt-6">Our Services in Hanamkonda</h2>
      <ul className="mt-4 list-disc pl-6">
        <li>Car Wash</li>
        <li>Bike Wash</li>
        <li>Interior Cleaning</li>
        <li>Water Tank Cleaning</li>
      </ul>
      <Link href="/book" className="mt-8 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg">
        Book Now
      </Link>
    </div>
  )
}