import React from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="bg-black text-white p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold">AUTO PRO</h1>
      <nav className="space-x-4">
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        <Link to="/services">Services</Link>
        <Link to="/inventory">Inventory</Link>
        <Link to="/appointments">Appointments</Link>
        <Link to="/contact">Contact</Link>
      </nav>
    </header>
  );
}
