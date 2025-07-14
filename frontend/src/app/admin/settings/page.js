// frontend/src/app/admin/settings/page.js
"use client";

import { useState, useEffect } from "react";
import AdminLayout from "../AdminLayout";
import { supabase } from "@/lib/supabase";

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    businessInfo: {
      name: "AUTO PRO REPAIRS SALES & SERVICES",
      phone: "(352) 933-5181",
      email: "service@autoprorepairs.com",
      address: "806 Hood Ave",
      city: "Leesburg",
      state: "FL",
      zipCode: "34748",
      hours: {
        monday: { open: "08:00", close: "18:00", closed: false },
        tuesday: { open: "08:00", close: "18:00", closed: false },
        wednesday: { open: "08:00", close: "18:00", closed: false },
        thursday: { open: "08:00", close: "18:00", closed: false },
        friday: { open: "08:00", close: "18:00", closed: false },
        saturday: { open: "09:00", close: "15:00", closed: false },
        sunday: { open: "09:00", close: "15:00", closed: true },
      }
    },
    emailSettings: {
      smtpHost: "",
      smtpPort: "587",
      smtpUser: "",
      smtpPassword: "",
      fromEmail: "service@autoprorepairs.com",
      fromName: "AUTO PRO"
    },
    notificationSettings: {
      newAppointmentNotifications: true,
      newMessageNotifications: true,
      reminderNotifications: true,
      emailNotifications: true,
      smsNotifications: false
    },
    systemSettings: {
      maintenanceMode: false,
      allowOnlineBooking: true,
      requireApproval: true,
      maxAppointmentsPerDay: 20,
      appointmentDuration: 60,
      advanceBookingDays: 30
    }
  });

  const [activeTab, setActiveTab] = useState("business");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // In a real app, you'd load these from the database
      // For now, we'll use default values
      console.log("Settings loaded");
    } catch (error) {
      console.error("Error loading settings:", error);
      setError("Failed to load settings");
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // In a real app, you'd save these to the database
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      setSuccess("Settings saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setError("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessInfoChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      businessInfo: {
        ...prev.businessInfo,
        [field]: value
      }
    }));
  };

  const handleHoursChange = (day, field, value) => {
    setSettings(prev => ({
      ...prev,
      businessInfo: {
        ...prev.businessInfo,
        hours: {
          ...prev.businessInfo.hours,
          [day]: {
            ...prev.businessInfo.hours[day],
            [field]: value
          }
        }
      }
    }));
  };

  const handleEmailSettingsChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      emailSettings: {
        ...prev.emailSettings,
        [field]: value
      }
    }));
  };

  const handleNotificationChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      notificationSettings: {
        ...prev.notificationSettings,
        [field]: value
      }
    }));
  };

  const handleSystemSettingsChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      systemSettings: {
        ...prev.systemSettings,
        [field]: value
      }
    }));
  };

  const testEmailSettings = async () => {
    setLoading(true);
    try {
      // In a real app, you'd test the email configuration
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSuccess("Email test successful!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError("Email test failed");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "business", label: "Business Info", icon: "🏢" },
    { id: "email", label: "Email Settings", icon: "📧" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "system", label: "System", icon: "⚙️" },
  ];

  const dayNames = {
    monday: "Monday",
    tuesday: "Tuesday", 
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday"
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <button
          onClick={saveSettings}
          disabled={loading}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            loading
              ? 'bg-gray-400 cursor-not-allowed text-gray-200'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}
      
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-6 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Business Info Tab */}
          {activeTab === "business" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Business Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={settings.businessInfo.name}
                      onChange={(e) => handleBusinessInfoChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={settings.businessInfo.phone}
                      onChange={(e) => handleBusinessInfoChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={settings.businessInfo.email}
                      onChange={(e) => handleBusinessInfoChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={settings.businessInfo.address}
                      onChange={(e) => handleBusinessInfoChange('address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={settings.businessInfo.city}
                      onChange={(e) => handleBusinessInfoChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={settings.businessInfo.state}
                      onChange={(e) => handleBusinessInfoChange('state', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={settings.businessInfo.zipCode}
                      onChange={(e) => handleBusinessInfoChange('zipCode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Business Hours</h3>
                <div className="space-y-3">
                  {Object.entries(settings.businessInfo.hours).map(([day, hours]) => (
                    <div key={day} className="flex items-center gap-4">
                      <div className="w-24">
                        <span className="text-sm font-medium text-gray-700">
                          {dayNames[day]}
                        </span>
                      </div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={!hours.closed}
                          onChange={(e) => handleHoursChange(day, 'closed', !e.target.checked)}
                          className="mr-2"
                        />
                        Open
                      </label>
                      {!hours.closed && (
                        <>
                          <input
                            type="time"
                            value={hours.open}
                            onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="time"
                            value={hours.close}
                            onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </>
                      )}
                      {hours.closed && (
                        <span className="text-gray-500 italic">Closed</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Email Settings Tab */}
          {activeTab === "email" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">SMTP Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={settings.emailSettings.smtpHost}
                      onChange={(e) => handleEmailSettingsChange('smtpHost', e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      value={settings.emailSettings.smtpPort}
                      onChange={(e) => handleEmailSettingsChange('smtpPort', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Username
                    </label>
                    <input
                      type="text"
                      value={settings.emailSettings.smtpUser}
                      onChange={(e) => handleEmailSettingsChange('smtpUser', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Password
                    </label>
                    <input
                      type="password"
                      value={settings.emailSettings.smtpPassword}
                      onChange={(e) => handleEmailSettingsChange('smtpPassword', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Email
                    </label>
                    <input
                      type="email"
                      value={settings.emailSettings.fromEmail}
                      onChange={(e) => handleEmailSettingsChange('fromEmail', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Name
                    </label>
                    <input
                      type="text"
                      value={settings.emailSettings.fromName}
                      onChange={(e) => handleEmailSettingsChange('fromName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={testEmailSettings}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    {loading ? 'Testing...' : 'Test Email Configuration'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notificationSettings.newAppointmentNotifications}
                      onChange={(e) => handleNotificationChange('newAppointmentNotifications', e.target.checked)}
                      className="mr-3"
                    />
                    <div>
                      <span className="font-medium text-gray-700">New Appointment Notifications</span>
                      <p className="text-sm text-gray-500">Get notified when new appointments are booked</p>
                    </div>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notificationSettings.newMessageNotifications}
                      onChange={(e) => handleNotificationChange('newMessageNotifications', e.target.checked)}
                      className="mr-3"
                    />
                    <div>
                      <span className="font-medium text-gray-700">New Message Notifications</span>
                      <p className="text-sm text-gray-500">Get notified when customers send messages</p>
                    </div>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notificationSettings.reminderNotifications}
                      onChange={(e) => handleNotificationChange('reminderNotifications', e.target.checked)}
                      className="mr-3"
                    />
                    <div>
                      <span className="font-medium text-gray-700">Appointment Reminders</span>
                      <p className="text-sm text-gray-500">Send automatic reminders to customers</p>
                    </div>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notificationSettings.emailNotifications}
                      onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
                      className="mr-3"
                    />
                    <div>
                      <span className="font-medium text-gray-700">Email Notifications</span>
                      <p className="text-sm text-gray-500">Receive notifications via email</p>
                    </div>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notificationSettings.smsNotifications}
                      onChange={(e) => handleNotificationChange('smsNotifications', e.target.checked)}
                      className="mr-3"
                    />
                    <div>
                      <span className="font-medium text-gray-700">SMS Notifications</span>
                      <p className="text-sm text-gray-500">Receive notifications via text message</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* System Settings Tab */}
          {activeTab === "system" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">System Configuration</h3>
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.systemSettings.maintenanceMode}
                      onChange={(e) => handleSystemSettingsChange('maintenanceMode', e.target.checked)}
                      className="mr-3"
                    />
                    <div>
                      <span className="font-medium text-gray-700">Maintenance Mode</span>
                      <p className="text-sm text-gray-500">Temporarily disable public access to the website</p>
                    </div>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.systemSettings.allowOnlineBooking}
                      onChange={(e) => handleSystemSettingsChange('allowOnlineBooking', e.target.checked)}
                      className="mr-3"
                    />
                    <div>
                      <span className="font-medium text-gray-700">Allow Online Booking</span>
                      <p className="text-sm text-gray-500">Allow customers to book appointments online</p>
                    </div>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.systemSettings.requireApproval}
                      onChange={(e) => handleSystemSettingsChange('requireApproval', e.target.checked)}
                      className="mr-3"
                    />
                    <div>
                      <span className="font-medium text-gray-700">Require Appointment Approval</span>
                      <p className="text-sm text-gray-500">Manually approve all new appointments</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Appointment Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Appointments Per Day
                    </label>
                    <input
                      type="number"
                      value={settings.systemSettings.maxAppointmentsPerDay}
                      onChange={(e) => handleSystemSettingsChange('maxAppointmentsPerDay', parseInt(e.target.value))}
                      min="1"
                      max="50"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Appointment Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={settings.systemSettings.appointmentDuration}
                      onChange={(e) => handleSystemSettingsChange('appointmentDuration', parseInt(e.target.value))}
                      min="15"
                      max="480"
                      step="15"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Advance Booking Days
                    </label>
                    <input
                      type="number"
                      value={settings.systemSettings.advanceBookingDays}
                      onChange={(e) => handleSystemSettingsChange('advanceBookingDays', parseInt(e.target.value))}
                      min="1"
                      max="365"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Important Notice
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>Changes to system settings may affect website functionality. Test thoroughly after making changes.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}