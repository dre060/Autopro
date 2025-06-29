// frontend/src/pages/About.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
  Users,
  Award,
  Heart,
  Shield,
  Clock,
  Star,
  Wrench,
  Car,
  CheckCircle,
  Calendar,
  Phone,
  MapPin,
  Target,
  Eye,
  Handshake,
  TrendingUp
} from 'lucide-react';

const About = () => {
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const staggerContainer = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const stats = [
    { number: '25+', label: 'Years of Experience', icon: Clock },
    { number: '10,000+', label: 'Happy Customers', icon: Users },
    { number: '5,000+', label: 'Vehicles Sold', icon: Car },
    { number: '4.9', label: 'Average Rating', icon: Star }
  ];

  const values = [
    {
      icon: Heart,
      title: 'Honesty',
      description: 'We believe in transparent, honest communication. No hidden fees, no surprise charges, just straight talk about your vehicle needs.',
      color: 'red'
    },
    {
      icon: Shield,
      title: 'Quality',
      description: 'Every repair is performed to the highest standards using quality parts and proven techniques. Your safety is our priority.',
      color: 'blue'
    },
    {
      icon: Handshake,
      title: 'Integrity',
      description: 'We do what we say we\'ll do, when we say we\'ll do it. Our reputation is built on keeping our promises to customers.',
      color: 'green'
    },
    {
      icon: Users,
      title: 'Community',
      description: 'As a family-owned business, we\'re committed to serving our Leesburg community with pride and dedication.',
      color: 'purple'
    }
  ];

  const team = [
    {
      name: 'Mike Rodriguez',
      role: 'Owner & Master Technician',
      experience: '25+ years',
      certifications: ['ASE Master Technician', 'EPA Certified', 'Advanced Engine Performance'],
      description: 'Mike founded AUTO PRO with a vision of providing honest, quality automotive service to the Leesburg community.',
      image: '/images/team/mike-rodriguez.jpg'
    },
    {
      name: 'Sarah Johnson',
      role: 'Service Manager',
      experience: '15+ years',
      certifications: ['ASE Service Consultant', 'Customer Service Excellence'],
      description: 'Sarah ensures every customer receives exceptional service and clear communication throughout their visit.',
      image: '/images/team/sarah-johnson.jpg'
    },
    {
      name: 'Carlos Martinez',
      role: 'Lead Mechanic',
      experience: '18+ years',
      certifications: ['ASE Certified', 'Brake Specialist', 'Transmission Expert'],
      description: 'Carlos specializes in complex repairs and diagnostic work, bringing precision to every job.',
      image: '/images/team/carlos-martinez.jpg'
    },
    {
      name: 'Jennifer Davis',
      role: 'Parts & Inventory Manager',
      experience: '12+ years',
      certifications: ['Parts Specialist Certification', 'Inventory Management'],
      description: 'Jennifer ensures we always have the right parts in stock to complete your repairs quickly.',
      image: '/images/team/jennifer-davis.jpg'
    }
  ];

  const milestones = [
    {
      year: '1999',
      title: 'AUTO PRO Founded',
      description: 'Mike Rodriguez opened AUTO PRO with a single bay and a commitment to honest service.'
    },
    {
      year: '2005',
      title: 'Facility Expansion',
      description: 'Doubled our capacity with additional service bays and expanded our team of certified technicians.'
    },
    {
      year: '2010',
      title: 'Vehicle Sales Added',
      description: 'Began offering quality used vehicles, carefully inspected and backed by our reputation.'
    },
    {
      year: '2015',
      title: 'Digital Innovation',
      description: 'Introduced online scheduling and digital service records for customer convenience.'
    },
    {
      year: '2020',
      title: '10,000th Customer',
      description: 'Celebrated serving our 10,000th satisfied customer, marking two decades of trusted service.'
    },
    {
      year: '2024',
      title: 'Continued Growth',
      description: 'Expanded our services and continue to invest in the latest diagnostic equipment and training.'
    }
  ];

  const certifications = [
    {
      name: 'ASE Certified',
      description: 'National Institute for Automotive Service Excellence',
      icon: Award
    },
    {
      name: 'EPA Certified',
      description: 'Environmental Protection Agency Certification',
      icon: Shield
    },
    {
      name: 'BBB Accredited',
      description: 'Better Business Bureau Accredited Business',
      icon: Star
    },
    {
      name: 'State Licensed',
      description: 'Florida State Licensed Automotive Facility',
      icon: CheckCircle
    }
  ];

  return (
    <>
      <Helmet>
        <title>About AUTO PRO | Family-Owned Auto Repair in Leesburg, FL</title>
        <meta name="description" content="Learn about AUTO PRO's 25+ year history of providing honest, quality auto repair and vehicle sales in Leesburg, FL. Meet our ASE certified team." />
        <meta name="keywords" content="about AUTO PRO, family owned, auto repair history, ASE certified, Leesburg FL, automotive service" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20 overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="text-center max-w-4xl mx-auto"
            >
              <h1 className="text-4xl lg:text-6xl font-bold mb-6">
                Our Story
              </h1>
              <p className="text-xl text-blue-100 mb-8">
                For over 25 years, AUTO PRO has been Leesburg's trusted partner for 
                automotive repair and quality used vehicles. Built on honesty, integrity, 
                and a genuine commitment to our community.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  to="/appointments"
                  className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors flex items-center"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Schedule Service
                </Link>
                
                <Link
                  to="/contact"
                  className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-blue-600 transition-colors flex items-center"
                >
                  <MapPin className="w-5 h-5 mr-2" />
                  Visit Our Shop
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="py-16 bg-white dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="text-center group"
                >
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-xl">
                    <stat.icon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                    {stat.number}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Our Story */}
        <div className="py-16">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="max-w-4xl mx-auto text-center mb-16"
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                The AUTO PRO Story
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                What started as a one-man operation in 1999 has grown into Leesburg's 
                most trusted automotive service center, but our core values remain unchanged.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="space-y-6"
              >
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Built on Trust, Driven by Excellence
                </h3>
                
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Mike Rodriguez founded AUTO PRO with a simple philosophy: treat every customer 
                  like family and every vehicle like it's your own. This commitment to honesty 
                  and quality has made us the go-to choice for thousands of satisfied customers 
                  throughout Central Florida.
                </p>
                
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Over the years, we've expanded our services and grown our team, but we've 
                  never lost sight of what makes us special. Whether you need a simple oil 
                  change or complex engine repair, you can count on the same personal attention 
                  and expert care that has defined AUTO PRO for over two decades.
                </p>

                <div className="flex items-center text-blue-600 dark:text-blue-400 font-semibold">
                  <Heart className="w-5 h-5 mr-2" />
                  "Honesty is our Policy" - It's not just our motto, it's our promise.
                </div>
              </motion.div>

              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden shadow-lg aspect-video flex items-center justify-center"
              >
                <div className="text-center">
                  <Car className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Shop photo will be placed here
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="py-16 bg-white dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="text-center mb-16"
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Our Core Values
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                These principles guide everything we do, from the simplest maintenance 
                to the most complex repairs.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {values.map((value, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="bg-gray-50 dark:bg-gray-900 rounded-xl p-8 hover:shadow-lg transition-shadow duration-300"
                >
                  <div className={`bg-gradient-to-br from-${value.color}-500 to-${value.color}-600 w-16 h-16 rounded-full flex items-center justify-center mb-6`}>
                    <value.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {value.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Timeline */}
        <div className="py-16">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="text-center mb-16"
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Our Journey
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                From humble beginnings to becoming Leesburg's premier automotive service center.
              </p>
            </motion.div>

            <div className="max-w-4xl mx-auto">
              {milestones.map((milestone, index) => (
                <motion.div
                  key={index}
                  initial="hidden"
                  animate="visible"
                  variants={fadeInUp}
                  transition={{ delay: index * 0.1 }}
                  className="relative flex items-start mb-8 last:mb-0"
                >
                  {/* Timeline line */}
                  {index < milestones.length - 1 && (
                    <div className="absolute left-6 top-16 w-0.5 h-16 bg-blue-200 dark:bg-blue-800"></div>
                  )}
                  
                  {/* Year badge */}
                  <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm mr-6 flex-shrink-0 z-10">
                    {milestone.year.slice(-2)}
                  </div>
                  
                  {/* Content */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                        {milestone.year}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      {milestone.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {milestone.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="py-16 bg-white dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="text-center mb-16"
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Meet Our Expert Team
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                Our ASE-certified technicians and experienced staff are dedicated to 
                providing you with exceptional automotive service.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {team.map((member, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
                >
                  {/* Photo placeholder */}
                  <div className="bg-gray-300 dark:bg-gray-600 h-64 flex items-center justify-center">
                    <Users className="w-16 h-16 text-gray-500" />
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {member.name}
                    </h3>
                    <p className="text-blue-600 dark:text-blue-400 font-semibold mb-2">
                      {member.role}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {member.experience}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                      {member.description}
                    </p>
                    
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        Certifications:
                      </h4>
                      <div className="space-y-1">
                        {member.certifications.map((cert, certIndex) => (
                          <div key={certIndex} className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                            <CheckCircle className="w-3 h-3 mr-2 text-green-500" />
                            {cert}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Certifications */}
        <div className="py-16">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="text-center mb-16"
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Trusted & Certified
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                Our certifications and accreditations demonstrate our commitment to 
                professional excellence and industry standards.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {certifications.map((cert, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="text-center group"
                >
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <cert.icon className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {cert.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {cert.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-16 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="max-w-4xl mx-auto"
            >
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                Experience the AUTO PRO Difference
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Join our family of satisfied customers and discover why AUTO PRO has been 
                Leesburg's trusted automotive partner for over 25 years.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  to="/appointments"
                  className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors flex items-center"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Schedule Service Today
                </Link>
                
                <a
                  href="tel:(352) 933-5181"
                  className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-blue-600 transition-colors flex items-center"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Call Us Now
                </a>
              </div>

              {/* Trust indicators */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span>4.9/5 Customer Rating</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  <span>ASE Certified Shop</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Heart className="w-5 h-5 text-red-400" />
                  <span>Family Owned Since 1999</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default About;