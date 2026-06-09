import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Doorstep Car Wash in Warangal | Zentro',
  description: 'Best doorstep car wash service in Warangal. We come to your home or office. Book online at zentroservice.in',
  keywords: 'doorstep car wash Warangal, home car wash Warangal, car wash at home Warangal',
}

export default function DoorstepCarWashWarangal() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Doorstep Car Wash in Warangal</h1>
      <p className="mt-4 text-lg">No need to go to a car wash! Zentro comes to your doorstep in Warangal!</p>
      <h2 className="text-2xl font-bold mt-6">How It Works</h2>
      <ul className="mt-4 list-disc pl-6">
        <li>Book online at zentroservice.in</li>
        <li>Our team arrives at your location</li>
        <li>Professional cleaning done</li>
        <li>Pay after service</li>
      </ul>
      <Link href="/book" className="mt-8 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg">Book Now</Link>
    </div>
  )
}