import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Bike Wash in Warangal - Doorstep Service | Zentro',
  description: 'Professional doorstep bike wash service in Warangal. Book online at zentroservice.in',
  keywords: 'bike wash Warangal, doorstep bike wash Warangal, two wheeler cleaning Warangal',
}

export default function BikeWashWarangal() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Bike Wash in Warangal</h1>
      <p className="mt-4 text-lg">Zentro offers professional doorstep bike wash services in Warangal. We come to your home!</p>
      <h2 className="text-2xl font-bold mt-6">Our Bike Services in Warangal</h2>
      <ul className="mt-4 list-disc pl-6">
        <li>Bike Wash</li>
        <li>Two Wheeler Cleaning</li>
        <li>Engine Cleaning</li>
      </ul>
      <Link href="/book" className="mt-8 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg">Book Now</Link>
    </div>
  )
}