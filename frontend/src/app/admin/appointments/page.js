// frontend/src/app/admin/appointments/page.js
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsAppointment, setDetailsAppointment] = useState(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      // Simulate API call
      setTimeout(() => {
        const mockAppointments = [
          {
            id: 1,
            customer: "John Doe",
            email: "john@example.com",
            phone: "(352) 555-0123",
            date: "2025-01-08",
            time: "10:00 AM",
            endTime: "11:00 AM",
            service: "Oil Change",
            services: ["Oil Change", "Filter Replacement"],
            vehicle: "2018 Honda Accord",
            vehicleVin: "1HGCV1F31JA123456",
            vehicleMileage: 45000,
            status: "pending",
            technician: "Mike Johnson",
            bay: "Bay 1",
            estimatedCost: 49.99,
            actualCost: null,
            notes: "Customer requested synthetic oil",
            internalNotes: "Regular customer, give 10% discount",
            urgency: "medium",
            reminderSent: false,
            confirmationSent: false,
            createdAt: "2025-01-05",
          },
          {
            id: 2,
            customer: "Jane Smith",
            email: "jane@example.com",
            phone: "(352) 555-0124",
            date: "2025-01-08",
            time: "2:00 PM",
            endTime: "4:00 PM",
            service: "Brake Service",
            services: ["Brake Pad Replacement", "Rotor Resurfacing"],
            vehicle: "2020 Toyota Camry",
            vehicleVin: "4T1B11HK5LU123456",
            vehicleMileage: 32000,
            status: "confirmed",
            technician: "Tom Wilson",
            bay: "Bay 2",
            estimatedCost: 199.99,
            actualCost: null,
            notes: "Front brakes only",
            internalNotes: "Check rear brakes as well",
            urgency: "high",
            reminderSent: true,
            confirmationSent: true,
            createdAt: "2025-01-03",
          },
          {
            id: 3,
            customer: "Bob Johnson",
            email: "bob@example.com",
            phone: "(352) 555-0125",
            date: "2025-01-09",
            time: "9:00 AM",
            endTime: "10:30 AM",
            service: "Engine Diagnostic",
            services: ["Diagnostic Scan", "System Check"],
            vehicle: "2019 Ford F-150",
            vehicleVin: "1FTEW1EP5KF123456",
            vehicleMileage: 38000,
            status: "in-progress",
            technician: "Mike Johnson",
            bay: "Bay 3",
            estimatedCost: 89.99,
            actualCost: 89.99,
            notes: "Check engine light on",
            internalNotes: "Possible O2 sensor issue",
            urgency: "medium",
            reminderSent: true,
            confirmationSent: true,
            createdAt: "2025-01-04",
          },
        ];
        setAppointments(mockAppointments);
        setFilteredAppointments(mockAppointments);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...appointments];

    // Apply status filter
    if (filter !== "all") {
      filtered = filtered.filter(apt => apt.status === filter);
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.customer.toLowerCase().includes(search) ||
        apt.email.toLowerCase().includes(search) ||
        apt.phone.includes(search) ||
        apt.vehicle.toLowerCase().includes(search) ||
        apt.service.toLowerCase().includes(search)
      );
    }

    // Apply date filter
    if (dateFilter) {
      filtered = filtered.filter(apt => apt.date === dateFilter);
    }

    setFilteredAppointments(filtered);
  }, [appointments, filter, searchTerm, dateFilter]);

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

  const getUrgencyColor = (urgency) => {
    const colors = {
      low: "text-green-600",
      medium: "text-yellow-600",
      high: "text-red-600",
      emergency: "text-red-700 font-bold",
    };
    return colors[urgency] || "text-gray-600";
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      // API call to update status
      console.log("Updating appointment status:", appointmentId, newStatus);
      
      setAppointments(appointments.map(apt => 
        apt.id === appointmentId ? { ...apt, status: newStatus } : apt
      ));
      
      // Send notifications if needed
      if (newStatus === 'confirmed') {
        console.log("Sending confirmation email...");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDelete = (appointment) => {
    setAppointmentToDelete(appointment);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      // API call to delete appointment
      console.log("Deleting appointment:", appointmentToDelete.id);
      
      setAppointments(appointments.filter(apt => apt.id !== appointmentToDelete.id));
      setShowDeleteModal(false);
      setAppointmentToDelete(null);
    } catch (error) {
      console.error("Error deleting appointment:", error);
    }
  };

  const handleEdit = (appointment) => {
    setEditingAppointment({ ...appointment });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    try {
      // API call to update appointment
      console.log("Updating appointment:", editingAppointment);
      
      setAppointments(appointments.map(apt => 
        apt.id === editingAppointment.id ? editingAppointment : apt
      ));
      setShowEditModal(false);
      setEditingAppointment(null);
    } catch (error) {
      console.error("Error updating appointment:", error);
    }
  };

  const handleViewDetails = (appointment) => {
    setDetailsAppointment(appointment);
    setShowDetailsModal(true);
  };

  const sendReminder = async (appointment) => {
    try {
      // API call to send reminder
      console.log("Sending reminder for appointment:", appointment.id);
      alert(`Reminder sent to ${appointment.customer} at ${appointment.email}`);
      
      setAppointments(appointments.map(apt => 
        apt.id === appointment.id ? { ...apt, reminderSent: true } : apt
      ));
    } catch (error) {
      console.error("Error sending reminder:", error);
    }
  };

  const exportAppointments = () => {
    // Convert appointments to CSV
    const headers = ["Date", "Time", "Customer", "Email", "Phone", "Service", "Vehicle", "Status", "Technician"];
    const rows = filteredAppointments.map(apt => [
      apt.date,
      apt.time,
      apt.customer,
      apt.email,
      apt.phone,
      apt.service,
      apt.vehicle,
      apt.status,
      apt.technician,
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appointments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Calculate stats
  const todayAppointments = appointments.filter(apt => apt.date === new Date().toISOString().split('T')[0]);
  const pendingCount = appointments.filter(apt => apt.status === 'pending').length;
  const confirmedCount = appointments.filter(apt => apt.status === 'confirmed').length;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
        <div className="flex gap-2">
          <button
            onClick={exportAppointments}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <Link
            href="/admin/appointments/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Appointment
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Today's Appointments</p>
          <p className="text-2xl font-bold">{todayAppointments.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Pending Confirmation</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Confirmed</p>
          <p className="text-2xl font-bold text-blue-600">{confirmedCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Revenue Today</p>
          <p className="text-2xl font-bold text-green-600">
            ${filteredAppointments
              .filter(apt => apt.date === new Date().toISOString().split('T')[0])
              .reduce((sum, apt) => sum + (apt.actualCost || apt.estimatedCost || 0), 0)
              .toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Status Filter */}
          <div className="flex gap-2">
            {["all", "pending", "confirmed", "in-progress", "completed", "cancelled", "no-show"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filter === status
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by customer, email, phone, or vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Date Filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Clear Filters */}
          {(filter !== "all" || searchTerm || dateFilter) && (
            <button
              onClick={() => {
                setFilter("all");
                setSearchTerm("");
                setDateFilter("");
              }}
              className="text-blue-600 hover:text-blue-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Technician
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="8" className="px-6 py-4 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                </td>
              </tr>
            ) : filteredAppointments.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                  No appointments found
                </td>
              </tr>
            ) : (
              filteredAppointments.map((appointment) => (
                <tr key={appointment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{appointment.date}</div>
                      <div className="text-sm text-gray-500">
                        {appointment.time} - {appointment.endTime}
                      </div>
                      <div className={`text-xs ${getUrgencyColor(appointment.urgency)}`}>
                        {appointment.urgency.toUpperCase()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{appointment.customer}</div>
                      <div className="text-xs text-gray-500">{appointment.email}</div>
                      <div className="text-xs text-gray-500">{appointment.phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{appointment.service}</div>
                    {appointment.services.length > 1 && (
                      <div className="text-xs text-gray-500">
                        +{appointment.services.length - 1} more services
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{appointment.vehicle}</div>
                    <div className="text-xs text-gray-500">
                      {appointment.vehicleMileage?.toLocaleString()} mi
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{appointment.technician}</div>
                    <div className="text-xs text-gray-500">{appointment.bay}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={appointment.status}
                      onChange={(e) => handleStatusChange(appointment.id, e.target.value)}
                      className={`text-xs rounded-full px-3 py-1 font-medium ${getStatusColor(appointment.status)}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no-show">No Show</option>
                    </select>
                    <div className="flex gap-1 mt-1">
                      {appointment.confirmationSent && (
                        <span className="text-xs text-green-600" title="Confirmation sent">✓C</span>
                      )}
                      {appointment.reminderSent && (
                        <span className="text-xs text-blue-600" title="Reminder sent">✓R</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${appointment.actualCost || appointment.estimatedCost}
                    </div>
                    {appointment.actualCost && appointment.estimatedCost !== appointment.actualCost && (
                      <div className="text-xs text-gray-500">
                        Est: ${appointment.estimatedCost}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetails(appointment)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEdit(appointment)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {!appointment.reminderSent && appointment.status === 'confirmed' && (
                        <button
                          onClick={() => sendReminder(appointment)}
                          className="text-green-600 hover:text-green-900"
                          title="Send Reminder"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(appointment)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && appointmentToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
            <p className="mb-6">
              Are you sure you want to delete the appointment for <strong>{appointmentToDelete.customer}</strong> on {appointmentToDelete.date} at {appointmentToDelete.time}?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingAppointment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Edit Appointment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={editingAppointment.date}
                  onChange={(e) => setEditingAppointment({ ...editingAppointment, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="text"
                  value={editingAppointment.time}
                  onChange={(e) => setEditingAppointment({ ...editingAppointment, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
                <select
                  value={editingAppointment.technician}
                  onChange={(e) => setEditingAppointment({ ...editingAppointment, technician: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Mike Johnson">Mike Johnson</option>
                  <option value="Tom Wilson">Tom Wilson</option>
                  <option value="Sarah Williams">Sarah Williams</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bay</label>
                <select
                  value={editingAppointment.bay}
                  onChange={(e) => setEditingAppointment({ ...editingAppointment, bay: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Bay 1">Bay 1</option>
                  <option value="Bay 2">Bay 2</option>
                  <option value="Bay 3">Bay 3</option>
                  <option value="Bay 4">Bay 4</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editingAppointment.status}
                  onChange={(e) => setEditingAppointment({ ...editingAppointment, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no-show">No Show</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                <select
                  value={editingAppointment.urgency}
                  onChange={(e) => setEditingAppointment({ ...editingAppointment, urgency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                <textarea
                  value={editingAppointment.internalNotes}
                  onChange={(e) => setEditingAppointment({ ...editingAppointment, internalNotes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && detailsAppointment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold">Appointment Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Customer Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">Name:</span> {detailsAppointment.customer}</p>
                  <p><span className="text-gray-500">Email:</span> {detailsAppointment.email}</p>
                  <p><span className="text-gray-500">Phone:</span> {detailsAppointment.phone}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Appointment Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">Date:</span> {detailsAppointment.date}</p>
                  <p><span className="text-gray-500">Time:</span> {detailsAppointment.time} - {detailsAppointment.endTime}</p>
                  <p><span className="text-gray-500">Status:</span> 
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(detailsAppointment.status)}`}>
                      {detailsAppointment.status}
                    </span>
                  </p>
                  <p><span className="text-gray-500">Urgency:</span> 
                    <span className={`ml-2 ${getUrgencyColor(detailsAppointment.urgency)}`}>
                      {detailsAppointment.urgency}
                    </span>
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Vehicle Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">Vehicle:</span> {detailsAppointment.vehicle}</p>
                  <p><span className="text-gray-500">VIN:</span> {detailsAppointment.vehicleVin}</p>
                  <p><span className="text-gray-500">Mileage:</span> {detailsAppointment.vehicleMileage?.toLocaleString()} miles</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Service Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">Technician:</span> {detailsAppointment.technician}</p>
                  <p><span className="text-gray-500">Bay:</span> {detailsAppointment.bay}</p>
                  <p><span className="text-gray-500">Services:</span></p>
                  <ul className="ml-4 list-disc">
                    {detailsAppointment.services.map((service, index) => (
                      <li key={index}>{service}</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="col-span-2">
                <h4 className="font-semibold text-gray-700 mb-2">Cost Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">Estimated Cost:</span> ${detailsAppointment.estimatedCost}</p>
                  {detailsAppointment.actualCost && (
                    <p><span className="text-gray-500">Actual Cost:</span> ${detailsAppointment.actualCost}</p>
                  )}
                </div>
              </div>
              
              <div className="col-span-2">
                <h4 className="font-semibold text-gray-700 mb-2">Notes</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">Customer Notes:</span> {detailsAppointment.notes || "None"}</p>
                  <p><span className="text-gray-500">Internal Notes:</span> {detailsAppointment.internalNotes || "None"}</p>
                </div>
              </div>
              
              <div className="col-span-2">
                <h4 className="font-semibold text-gray-700 mb-2">Communication Status</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-500">Confirmation:</span> 
                    {detailsAppointment.confirmationSent ? (
                      <span className="text-green-600 ml-2">✓ Sent</span>
                    ) : (
                      <span className="text-gray-400 ml-2">Not sent</span>
                    )}
                  </p>
                  <p>
                    <span className="text-gray-500">Reminder:</span> 
                    {detailsAppointment.reminderSent ? (
                      <span className="text-green-600 ml-2">✓ Sent</span>
                    ) : (
                      <span className="text-gray-400 ml-2">Not sent</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}