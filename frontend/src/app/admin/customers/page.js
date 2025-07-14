// frontend/src/app/admin/customers/page.js
"use client";

import { useState, useEffect } from "react";
import AdminLayout from "../AdminLayout";
import { supabase } from "@/lib/supabase";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [customerAppointments, setCustomerAppointments] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // Get unique customers from appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('name, email, phone, created_at')
        .order('created_at', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      // Group appointments by email to get unique customers
      const customerMap = new Map();
      appointmentsData?.forEach(appointment => {
        const key = appointment.email.toLowerCase();
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            name: appointment.name,
            email: appointment.email,
            phone: appointment.phone,
            first_seen: appointment.created_at,
            appointment_count: 1,
          });
        } else {
          const customer = customerMap.get(key);
          customer.appointment_count += 1;
          // Keep the earliest date
          if (appointment.created_at < customer.first_seen) {
            customer.first_seen = appointment.created_at;
          }
        }
      });

      // Also get customers from contact messages
      const { data: contactsData, error: contactsError } = await supabase
        .from('contact_messages')
        .select('name, email, phone, created_at')
        .order('created_at', { ascending: false });

      if (contactsError) throw contactsError;

      contactsData?.forEach(contact => {
        const key = contact.email.toLowerCase();
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            first_seen: contact.created_at,
            appointment_count: 0,
          });
        }
      });

      const customersArray = Array.from(customerMap.values())
        .sort((a, b) => new Date(b.first_seen) - new Date(a.first_seen));

      setCustomers(customersArray);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetails = async (customer) => {
    try {
      setSelectedCustomer(customer);
      
      // Get all appointments for this customer
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .ilike('email', customer.email)
        .order('date', { ascending: false });

      if (error) throw error;
      
      setCustomerAppointments(appointments || []);
      setShowDetails(true);
    } catch (error) {
      console.error('Error fetching customer details:', error);
      setError("Failed to load customer details");
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      "in-progress": "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      "no-show": "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const exportCustomers = () => {
    const headers = ["Name", "Email", "Phone", "First Seen", "Total Appointments"];
    const rows = filteredCustomers.map(customer => [
      customer.name,
      customer.email,
      customer.phone,
      new Date(customer.first_seen).toLocaleDateString(),
      customer.appointment_count,
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
        <button
          onClick={exportCustomers}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Customers</p>
          <p className="text-2xl font-bold">{customers.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Repeat Customers</p>
          <p className="text-2xl font-bold text-green-600">
            {customers.filter(c => c.appointment_count > 1).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">New This Month</p>
          <p className="text-2xl font-bold text-blue-600">
            {customers.filter(c => 
              new Date(c.first_seen) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            ).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Avg Appointments</p>
          <p className="text-2xl font-bold text-purple-600">
            {customers.length > 0 
              ? (customers.reduce((sum, c) => sum + c.appointment_count, 0) / customers.length).toFixed(1)
              : 0
            }
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search customers by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-blue-600 hover:text-blue-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading customers...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm ? 'No customers found matching your search.' : 'No customers found.'}
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  First Seen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Appointments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                      {customer.appointment_count > 1 && (
                        <div className="text-xs text-green-600 font-medium">Repeat Customer</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{customer.email}</div>
                    <div className="text-sm text-gray-500">{customer.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(customer.first_seen).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      customer.appointment_count > 3 
                        ? 'bg-green-100 text-green-800'
                        : customer.appointment_count > 1
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {customer.appointment_count} appointment{customer.appointment_count !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => fetchCustomerDetails(customer)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View Details
                    </button>
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-green-600 hover:text-green-900 mr-3"
                    >
                      Email
                    </a>
                    <a
                      href={`tel:${customer.phone}`}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      Call
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Customer Details Modal */}
      {showDetails && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold">Customer Details: {selectedCustomer.name}</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-700 mb-2">Contact Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">Name:</span> {selectedCustomer.name}</p>
                  <p><span className="text-gray-500">Email:</span> {selectedCustomer.email}</p>
                  <p><span className="text-gray-500">Phone:</span> {selectedCustomer.phone}</p>
                  <p><span className="text-gray-500">First Seen:</span> {new Date(selectedCustomer.first_seen).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-700 mb-2">Statistics</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">Total Appointments:</span> {selectedCustomer.appointment_count}</p>
                  <p><span className="text-gray-500">Customer Type:</span> 
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedCustomer.appointment_count > 1 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedCustomer.appointment_count > 1 ? 'Repeat Customer' : 'New Customer'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Appointment History */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-4">Appointment History ({customerAppointments.length})</h4>
              {customerAppointments.length === 0 ? (
                <p className="text-gray-500 text-sm">No appointments found for this customer.</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {customerAppointments.map((appointment) => (
                    <div key={appointment.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{appointment.service}</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                              {appointment.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {appointment.date} at {appointment.time}
                          </p>
                          {appointment.vehicle_info && (
                            <p className="text-xs text-gray-500">
                              Vehicle: {appointment.vehicle_info.year} {appointment.vehicle_info.make} {appointment.vehicle_info.model}
                            </p>
                          )}
                          {appointment.message && (
                            <p className="text-xs text-gray-500 mt-1">
                              Note: {appointment.message}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {appointment.actual_cost?.total && (
                            <p className="text-sm font-medium text-green-600">
                              ${appointment.actual_cost.total}
                            </p>
                          )}
                          {appointment.estimated_cost?.total && !appointment.actual_cost?.total && (
                            <p className="text-sm text-gray-500">
                              Est: ${appointment.estimated_cost.total}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <a
                href={`mailto:${selectedCustomer.email}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                Send Email
              </a>
              <a
                href={`tel:${selectedCustomer.phone}`}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                Call Customer
              </a>
              <button
                onClick={() => setShowDetails(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}