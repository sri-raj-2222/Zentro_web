import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Car Wash in Warangal - Doorstep Service | Zentro',
  description: 'Professional doorstep car wash service in Warangal. Zentro brings the car wash to your home or office. Book online at zentroservice.in',
  keywords: 'car wash Warangal, doorstep car wash Warangal, vehicle cleaning Warangal',
}

export default function CarWashWarangal() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Car Wash in Warangal</h1>
      <p className="mt-4 text-lg">Zentro offers professional doorstep car wash services in Warangal. We come to your home or office!</p>
      <h2 className="text-2xl font-bold mt-6">Our Services in Warangal</h2>
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