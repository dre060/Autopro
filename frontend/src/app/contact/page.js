// frontend/src/app/contact/page.js
"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeInfo, setActiveInfo] = useState("hours");
  const [isVisible, setIsVisible] = useState({});
  const observerRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll(".animate-on-scroll");
    elements.forEach((el) => observerRef.current.observe(el));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
      
      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
    }, 2000);
  };

  const contactMethods = [
    {
      icon: "📍",
      title: "Visit Us",
      info: "123 Main Street, Leesburg, FL 34748",
      action: "Get Directions",
      link: "https://maps.google.com",
      color: "from-blue-600 to-cyan-600"
    },
    {
      icon: "📞",
      title: "Call Us",
      info: "(352) 339-5181",
      action: "Call Now",
      link: "tel:3523395181",
      color: "from-green-600 to-emerald-600"
    },
    {
      icon: "📧",
      title: "Email Us",
      info: "info@autopro.com",
      action: "Send Email",
      link: "mailto:info@autopro.com",
      color: "from-purple-600 to-pink-600"
    },
  ];

  const businessInfo = {
    hours: {
      title: "Business Hours",
      icon: "🕐",
      content: [
        { day: "Monday - Friday", time: "8:00 AM - 6:00 PM", open: true },
        { day: "Saturday", time: "9:00 AM - 3:00 PM", open: true },
        { day: "Sunday", time: "Closed", open: false },
      ]
    },
    services: {
      title: "Quick Services",
      icon: "⚡",
      content: [
        "Oil Change (30 min)",
        "Tire Rotation (45 min)",
        "Battery Test (15 min)",
        "AC Check (30 min)",
      ]
    },
    emergency: {
      title: "Emergency",
      icon: "🚨",
      content: [
        "24/7 Towing Available",
        "Emergency: (352) 339-5181",
        "Roadside Assistance",
        "After-Hours Drop-Off",
      ]
    },
  };

  return
  
      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[400px] w-full overflow-hidden">
        <Image
          src="/hero.jpg"
          alt="Contact AUTO PRO"
          fill
          className="object-cover brightness-50"
          priority
        />
        <div className="absolute inset-0 bg-gradient