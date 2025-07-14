// frontend/src/app/admin/testimonials/page.js
"use client";

import { useState, useEffect } from "react";
import AdminLayout from "../AdminLayout";
import { getTestimonials, createTestimonial, supabase } from "@/lib/supabase";

export default function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    rating: 5,
    title: "",
    content: "",
    service_type: "",
    vehicle_info: "",
    approved: false,
    featured: false,
  });

  useEffect(() => {
    fetchTestimonials();
  }, [filter]);

  const fetchTestimonials = async () => {
    setLoading(true);
    try {
      const approved = filter === "all" ? null : filter === "approved";
      const { data, error } = await getTestimonials(approved);
      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      setError("Failed to load testimonials");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value) : value)
    }));
  };

  const resetForm = () => {
    setFormData({
      customer_name: "",
      customer_email: "",
      rating: 5,
      title: "",
      content: "",
      service_type: "",
      vehicle_info: "",
      approved: false,
      featured: false,
    });
    setShowForm(false);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const { error } = await createTestimonial(formData);
      if (error) throw error;
      
      setSuccess('Testimonial created successfully!');
      resetForm();
      fetchTestimonials();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error('Error creating testimonial:', error);
      setError(error.message || 'Failed to create testimonial');
    }
  };

  const handleApproval = async (id, approved) => {
    try {
      const { error } = await supabase
        .from('testimonials')
        .update({ approved })
        .eq('id', id);
      
      if (error) throw error;
      fetchTestimonials();
    } catch (error) {
      console.error('Error updating approval:', error);
      setError('Failed to update testimonial');
    }
  };

  const handleFeatured = async (id, featured) => {
    try {
      const { error } = await supabase
        .from('testimonials')
        .update({ featured })
        .eq('id', id);
      
      if (error) throw error;
      fetchTestimonials();
    } catch (error) {
      console.error('Error updating featured status:', error);
      setError('Failed to update testimonial');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) return;

    try {
      const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setSuccess('Testimonial deleted successfully!');
      fetchTestimonials();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      setError('Failed to delete testimonial');
    }
  };

  const getRatingStars = (rating) => {
    return "⭐".repeat(rating) + "☆".repeat(5 - rating);
  };

  const filteredTestimonials = testimonials.filter(testimonial => {
    if (filter === "approved") return testimonial.approved;
    if (filter === "pending") return !testimonial.approved;
    return true;
  });

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Testimonials Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add New Testimonial'}
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}
      
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Testimonials</p>
          <p className="text-2xl font-bold">{testimonials.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Approved</p>
          <p className="text-2xl font-bold text-green-600">
            {testimonials.filter(t => t.approved).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Pending Review</p>
          <p className="text-2xl font-bold text-yellow-600">
            {testimonials.filter(t => !t.approved).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Featured</p>
          <p className="text-2xl font-bold text-purple-600">
            {testimonials.filter(t => t.featured).length}
          </p>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Add New Testimonial</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Email
                </label>
                <input
                  type="email"
                  name="customer_email"
                  value={formData.customer_email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rating *
                </label>
                <select
                  name="rating"
                  value={formData.rating}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5 Stars - Excellent</option>
                  <option value={4}>4 Stars - Very Good</option>
                  <option value={3}>3 Stars - Good</option>
                  <option value={2}>2 Stars - Fair</option>
                  <option value={1}>1 Star - Poor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Type
                </label>
                <input
                  type="text"
                  name="service_type"
                  value={formData.service_type}
                  onChange={handleInputChange}
                  placeholder="e.g., Oil Change, Brake Repair"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Great Service!"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Information
              </label>
              <input
                type="text"
                name="vehicle_info"
                value={formData.vehicle_info}
                onChange={handleInputChange}
                placeholder="e.g., 2020 Honda Civic"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Testimonial Content *
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="The customer's testimonial..."
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="approved"
                  checked={formData.approved}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Approved</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Featured</span>
              </label>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Add Testimonial
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-2">
          {["all", "approved", "pending"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Testimonials Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading testimonials...</p>
          </div>
        ) : filteredTestimonials.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No testimonials</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === "pending" 
                ? "No testimonials pending review."
                : filter === "approved"
                ? "No approved testimonials."
                : "Get started by adding a new testimonial."
              }
            </p>
          </div>
        ) : (
          filteredTestimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {testimonial.customer_name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getRatingStars(testimonial.rating)}</span>
                      <span className="text-sm text-gray-500">({testimonial.rating}/5)</span>
                    </div>
                  </div>
                  
                  {testimonial.title && (
                    <h4 className="text-md font-medium text-gray-800 mb-2">"{testimonial.title}"</h4>
                  )}
                  
                  <p className="text-gray-700 mb-3 leading-relaxed">"{testimonial.content}"</p>
                  
                  <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                    <span>Posted: {new Date(testimonial.created_at).toLocaleDateString()}</span>
                    {testimonial.service_type && (
                      <>
                        <span>•</span>
                        <span>Service: {testimonial.service_type}</span>
                      </>
                    )}
                    {testimonial.vehicle_info && (
                      <>
                        <span>•</span>
                        <span>Vehicle: {testimonial.vehicle_info}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <div className="flex gap-2">
                    {testimonial.approved && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Approved
                      </span>
                    )}
                    {!testimonial.approved && (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                        Pending
                      </span>
                    )}
                    {testimonial.featured && (
                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                        Featured
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                {!testimonial.approved ? (
                  <button
                    onClick={() => handleApproval(testimonial.id, true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Approve
                  </button>
                ) : (
                  <button
                    onClick={() => handleApproval(testimonial.id, false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Unapprove
                  </button>
                )}
                
                <button
                  onClick={() => handleFeatured(testimonial.id, !testimonial.featured)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    testimonial.featured
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-purple-100 hover:bg-purple-200 text-purple-800'
                  }`}
                >
                  {testimonial.featured ? 'Unfeature' : 'Feature'}
                </button>
                
                <button
                  onClick={() => handleDelete(testimonial.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}