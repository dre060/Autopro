// frontend/src/app/admin/messages/page.js
"use client";

import { useState, useEffect } from "react";
import AdminLayout from "../AdminLayout";
import { getContactMessages, supabase } from "@/lib/supabase";

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    filterMessages();
  }, [messages, filter]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await getContactMessages();
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const filterMessages = () => {
    let filtered = [...messages];
    
    switch (filter) {
      case "unread":
        filtered = filtered.filter(msg => !msg.read);
        break;
      case "read":
        filtered = filtered.filter(msg => msg.read);
        break;
      case "responded":
        filtered = filtered.filter(msg => msg.responded);
        break;
      case "pending":
        filtered = filtered.filter(msg => !msg.responded);
        break;
      default:
        break;
    }

    setFilteredMessages(filtered);
  };

  const markAsRead = async (id) => {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      setMessages(messages.map(msg => 
        msg.id === id ? { ...msg, read: true, read_at: new Date().toISOString() } : msg
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAsResponded = async (id) => {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ 
          responded: true, 
          responded_at: new Date().toISOString(),
          response_text: replyText 
        })
        .eq('id', id);
      
      if (error) throw error;
      
      setMessages(messages.map(msg => 
        msg.id === id ? { 
          ...msg, 
          responded: true, 
          responded_at: new Date().toISOString(),
          response_text: replyText 
        } : msg
      ));
      
      setSuccess('Message marked as responded!');
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error('Error marking as responded:', error);
      setError('Failed to mark as responded');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setMessages(messages.filter(msg => msg.id !== id));
      setSuccess('Message deleted successfully!');
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error('Error deleting message:', error);
      setError('Failed to delete message');
    }
  };

  const handleViewDetails = (message) => {
    setSelectedMessage(message);
    setShowDetails(true);
    setReplyText(message.response_text || "");
    
    // Mark as read if not already read
    if (!message.read) {
      markAsRead(message.id);
    }
  };

  const handleReply = () => {
    if (!selectedMessage) return;
    
    const email = selectedMessage.email;
    const subject = `Re: ${selectedMessage.subject}`;
    const body = `Hi ${selectedMessage.name},\n\nThank you for contacting AUTO PRO REPAIRS SALES & SERVICES.\n\n${replyText}\n\nBest regards,\nAUTO PRO Team\n(352) 933-5181\n806 Hood Ave, Leesburg, FL 34748`;
    
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink);
    
    // Mark as responded
    markAsResponded(selectedMessage.id);
    setShowReply(false);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTimeSince = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customer Messages</h1>
        <button
          onClick={fetchMessages}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
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
          <p className="text-sm text-gray-600">Total Messages</p>
          <p className="text-2xl font-bold">{messages.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Unread</p>
          <p className="text-2xl font-bold text-red-600">
            {messages.filter(m => !m.read).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Pending Response</p>
          <p className="text-2xl font-bold text-yellow-600">
            {messages.filter(m => !m.responded).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Responded</p>
          <p className="text-2xl font-bold text-green-600">
            {messages.filter(m => m.responded).length}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "All Messages" },
            { key: "unread", label: "Unread" },
            { key: "pending", label: "Pending Response" },
            { key: "responded", label: "Responded" },
          ].map((filterOption) => (
            <button
              key={filterOption.key}
              onClick={() => setFilter(filterOption.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === filterOption.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading messages...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1h-4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No messages found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === "unread" 
                ? "No unread messages."
                : filter === "pending"
                ? "No messages pending response."
                : "No messages to display."
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredMessages.map((message) => (
              <div 
                key={message.id} 
                className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !message.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => handleViewDetails(message)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`font-semibold ${!message.read ? 'text-blue-900' : 'text-gray-900'}`}>
                        {message.name}
                      </h3>
                      <span className="text-sm text-gray-500">{message.email}</span>
                      {!message.read && (
                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                          New
                        </span>
                      )}
                      {message.responded && (
                        <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                          Responded
                        </span>
                      )}
                    </div>
                    
                    <h4 className="text-lg font-medium text-gray-800 mb-2">
                      {message.subject}
                    </h4>
                    
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {message.message.length > 150 
                        ? `${message.message.substring(0, 150)}...`
                        : message.message
                      }
                    </p>
                    
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>📅 {getTimeSince(message.created_at)}</span>
                      {message.phone && (
                        <span>📞 {message.phone}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      <a
                        href={`mailto:${message.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Reply via Email"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89c.39.39 1.02.39 1.41 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </a>
                      {message.phone && (
                        <a
                          href={`tel:${message.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title="Call Customer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.986.836l.74 4.435a1 1 0 01-.502 1.21l-2.257 1.13a11.037 11.037 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.435.74a1 1 0 01.836.986V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </a>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(message.id);
                        }}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Delete Message"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Details Modal */}
      {showDetails && selectedMessage && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-bold">Message Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">From:</label>
                  <p className="text-gray-900">{selectedMessage.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email:</label>
                  <p className="text-gray-900">{selectedMessage.email}</p>
                </div>
                {selectedMessage.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone:</label>
                    <p className="text-gray-900">{selectedMessage.phone}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700">Received:</label>
                  <p className="text-gray-900">{new Date(selectedMessage.created_at).toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Subject:</label>
                <p className="text-gray-900 font-medium">{selectedMessage.subject}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Message:</label>
                <div className="bg-gray-50 rounded-lg p-4 mt-1">
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>
              </div>

              {selectedMessage.responded && selectedMessage.response_text && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Previous Response:</label>
                  <div className="bg-green-50 rounded-lg p-4 mt-1">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedMessage.response_text}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Responded on: {new Date(selectedMessage.responded_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Reply Section */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-gray-700">Quick Reply:</label>
                  <button
                    onClick={() => setShowReply(!showReply)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    {showReply ? 'Hide' : 'Show'} Reply Box
                  </button>
                </div>
                
                {showReply && (
                  <div className="space-y-3">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={4}
                      placeholder="Type your response here..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleReply}
                        disabled={!replyText.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Send Reply
                      </button>
                      <button
                        onClick={() => markAsResponded(selectedMessage.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Mark as Responded
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <a
                href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                Reply via Email
              </a>
              {selectedMessage.phone && (
                <a
                  href={`tel:${selectedMessage.phone}`}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  Call Customer
                </a>
              )}
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