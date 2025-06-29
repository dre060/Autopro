import React, { useState } from 'react';

export default function Appointments() {
  const [form, setForm] = useState({ name: '', phone: '', date: '', service: '' });
  const [status, setStatus] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setStatus('✅ Appointment submitted!');
      setForm({ name: '', phone: '', date: '', service: '' });
    } else {
      setStatus('❌ Something went wrong.');
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Book an Appointment</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required className="w-full p-2 border" />
        <input type="tel" name="phone" placeholder="Phone Number" value={form.phone} onChange={handleChange} required className="w-full p-2 border" />
        <input type="date" name="date" value={form.date} onChange={handleChange} required className="w-full p-2 border" />
        <input type="text" name="service" placeholder="Service Needed" value={form.service} onChange={handleChange} className="w-full p-2 border" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Submit</button>
        <p className="text-green-600">{status}</p>
      </form>
    </div>
  );
}
