// ===== frontend/src/app/about/page.js =====
import Image from "next/image";

export default function About() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[400px] w-full">
        <Image
          src="/hero.jpg"
          alt="About AUTO PRO REPAIRS SALES & SERVICES"
          fill
          className="object-cover brightness-50"
          priority
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-4xl md:text-6xl font-bold text-center animate-fade-in-up">
            About AUTO PRO REPAIRS SALES & SERVICES
          </h1>
        </div>
      </section>

      {/* About Content */}
      <section className="py-16 px-4 bg-black">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-left">
              <h2 className="text-3xl font-bold mb-4">3 Years Serving Leesburg, 20+ Years Experience</h2>
              <p className="text-gray-300 mb-4">
                For 3 years, AUTO PRO REPAIRS SALES & SERVICES has been the trusted choice for auto repair and vehicle sales 
                in Leesburg, FL. As a family-owned business, we treat every customer like family and every 
                car as if it were our own.
              </p>
              <p className="text-gray-300 mb-4">
                Our ASE-certified technicians bring over 20 years of combined experience to every repair, ensuring 
                your vehicle receives the highest quality service at fair, honest prices.
              </p>
              <p className="text-gray-300 mb-6">
                Whether you need routine maintenance, major repairs, or are looking for a quality pre-owned 
                vehicle, we're here to serve you with integrity and expertise.
              </p>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-blue-400">5000+</div>
                  <div className="text-sm text-gray-400">Happy Customers</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-400">20+</div>
                  <div className="text-sm text-gray-400">Years Experience</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-400">100%</div>
                  <div className="text-sm text-gray-400">Satisfaction</div>
                </div>
              </div>
            </div>
            <div className="relative h-96 animate-fade-in-right">
              <Image
                src="/hero.jpg" // Replace with team photo
                alt="AUTO PRO REPAIRS SALES & SERVICES Team"
                fill
                className="object-cover rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 px-4 bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-lg p-8">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
              <p className="text-gray-300">
                To provide honest, reliable, and affordable automotive services while building lasting relationships 
                with our customers. We strive to exceed expectations with every interaction, ensuring your vehicle 
                runs safely and efficiently.
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-8">
              <div className="text-4xl mb-4">👁️</div>
              <h3 className="text-2xl font-bold mb-4">Our Vision</h3>
              <p className="text-gray-300">
                To be the most trusted name in automotive repair and sales in Central Florida. We aim to set 
                the standard for customer service, technical expertise, and community involvement in the 
                automotive industry.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 px-4 bg-black">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Our Core Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group hover:transform hover:scale-105 transition-all">
              <div className="bg-blue-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-700">
                <span className="text-4xl">🤝</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Honesty & Integrity</h3>
              <p className="text-gray-300">
                We believe in transparent pricing and honest recommendations. No surprises, no unnecessary repairs. 
                We'll always tell you what your vehicle needs and what can wait.
              </p>
            </div>
            <div className="text-center group hover:transform hover:scale-105 transition-all">
              <div className="bg-blue-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-700">
                <span className="text-4xl">⭐</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Quality Excellence</h3>
              <p className="text-gray-300">
                From parts to service, we never compromise on quality. Your safety and satisfaction are our priority. 
                We use only the best parts and employ the most skilled technicians.
              </p>
            </div>
            <div className="text-center group hover:transform hover:scale-105 transition-all">
              <div className="bg-blue-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-700">
                <span className="text-4xl">👨‍👩‍👧‍👦</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Community First</h3>
              <p className="text-gray-300">
                As locals serving locals, we're invested in our community and building lasting relationships. 
                We support local organizations and treat every customer like a neighbor.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 px-4 bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Meet Our Team</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="relative w-48 h-48 mx-auto mb-4 rounded-full overflow-hidden">
                <Image
                  src="/hero.jpg" // Replace with actual team member photo
                  alt="Team Member"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-bold">John Smith</h3>
              <p className="text-blue-400 mb-2">Owner & Master Technician</p>
              <p className="text-gray-300 text-sm">
                20+ years experience, ASE Master Certified
              </p>
            </div>
            <div className="text-center">
              <div className="relative w-48 h-48 mx-auto mb-4 rounded-full overflow-hidden">
                <Image
                  src="/hero.jpg" // Replace with actual team member photo
                  alt="Team Member"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-bold">Mike Johnson</h3>
              <p className="text-blue-400 mb-2">Service Manager</p>
              <p className="text-gray-300 text-sm">
                15+ years experience, Customer service expert
              </p>
            </div>
            <div className="text-center">
              <div className="relative w-48 h-48 mx-auto mb-4 rounded-full overflow-hidden">
                <Image
                  src="/hero.jpg" // Replace with actual team member photo
                  alt="Team Member"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-bold">Sarah Davis</h3>
              <p className="text-blue-400 mb-2">Sales Manager</p>
              <p className="text-gray-300 text-sm">
                10+ years experience, Finance specialist
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Awards & Certifications */}
      <section className="py-16 px-4 bg-black">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Awards & Certifications</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition-colors">
                <div className="text-5xl mb-4">🏆</div>
                <p className="font-semibold">ASE Certified</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition-colors">
                <div className="text-5xl mb-4">⭐</div>
                <p className="font-semibold">5-Star Reviews</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition-colors">
                <div className="text-5xl mb-4">🛡️</div>
                <p className="font-semibold">BBB Accredited</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition-colors">
                <div className="text-5xl mb-4">🤝</div>
                <p className="font-semibold">Community Partner</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-blue-800 text-center">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Experience the AUTO PRO Difference?</h2>
          <p className="text-xl mb-8">
            Join thousands of satisfied customers who trust us with their vehicles.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/appointment"
              className="bg-white hover:bg-gray-100 text-blue-600 px-8 py-4 rounded-lg font-semibold transition-all transform hover:scale-105"
            >
              Schedule Service
            </a>
            <a 
              href="/inventory"
              className="bg-black hover:bg-gray-900 text-white px-8 py-4 rounded-lg font-semibold transition-all transform hover:scale-105"
            >
              Browse Inventory
            </a>
          </div>
        </div>
      </section>
    </>
  );
}