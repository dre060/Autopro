// frontend/src/app/about/page.js
import Image from "next/image";

export default function About() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[400px] w-full">
        <Image
          src="/hero.jpg"
          alt="About AUTO PRO"
          fill
          className="object-cover brightness-50"
          priority
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-4xl md:text-6xl font-bold text-center">About AUTO PRO</h1>
        </div>
      </section>

      {/* About Content */}
      <section className="py-16 px-4 bg-black">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Family-Owned Since 2004</h2>
              <p className="text-gray-300 mb-4">
                For over 3 years, AUTO PRO has been the trusted choice for auto repair and vehicle sales 
                in Leesburg, FL. As a family-owned business, we treat every customer like family and every 
                car as if it were our own.
              </p>
              <p className="text-gray-300 mb-4">
                Our ASE-certified technicians bring decades of combined experience to every repair, ensuring 
                your vehicle receives the highest quality service at fair, honest prices.
              </p>
              <p className="text-gray-300">
                Whether you need routine maintenance, major repairs, or are looking for a quality pre-owned 
                vehicle, we're here to serve you with integrity and expertise.
              </p>
            </div>
            <div className="relative h-96">
              <Image
                src="/hero.jpg" // Replace with team photo
                alt="AUTO PRO Team"
                fill
                className="object-cover rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 px-4 bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Our Core Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🤝</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Honesty</h3>
              <p className="text-gray-300">
                We believe in transparent pricing and honest recommendations. No surprises, no unnecessary repairs.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⭐</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Quality</h3>
              <p className="text-gray-300">
                From parts to service, we never compromise on quality. Your safety and satisfaction are our priority.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👨‍👩‍👧‍👦</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Community</h3>
              <p className="text-gray-300">
                As locals serving locals, we're invested in our community and building lasting relationships.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-black text-center">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Experience the AUTO PRO Difference?</h2>
          <p className="text-gray-300 mb-8">
            Join thousands of satisfied customers who trust us with their vehicles.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/appointment"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded font-semibold transition-colors"
            >
              Schedule Service
            </a>
            <a 
              href="/inventory"
              className="bg-white hover:bg-gray-100 text-black px-8 py-3 rounded font-semibold transition-colors"
            >
              Browse Inventory
            </a>
          </div>
        </div>
      </section>
    </>
  );
}