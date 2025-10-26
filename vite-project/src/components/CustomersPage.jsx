import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3005";

  const makeAuthenticatedRequest = async (url, options = {}) => {
    const defaultOptions = {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, defaultOptions);

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/admin/login";
          throw new Error("Authentication required");
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Request failed for ${url}:`, error);
      throw error;
    }
  };

  const fetchCustomers = async (
    page = 1,
    search = "",
    role = "",
    status = ""
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(role && { role }),
        ...(status && { status }),
      });

      const data = await makeAuthenticatedRequest(
        `/api/admin/customers?${params}`
      );
      setCustomers(data.customers || []);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.currentPage || 1);
    } catch (error) {
      console.error("Error fetching customers:", error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCustomers(1, searchTerm, roleFilter, statusFilter);
  };

  const handleReset = () => {
    setSearchTerm("");
    setRoleFilter("");
    setStatusFilter("");
    fetchCustomers();
  };

  const updateCustomerStatus = async (customerId, isActive) => {
    try {
      const response = await makeAuthenticatedRequest(
        `/api/admin/customers/${customerId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ isActive }),
        }
      );

      if (response.success) {
        fetchCustomers(currentPage, searchTerm, roleFilter, statusFilter);
      } else {
        alert("Failed to update customer status");
      }
    } catch (error) {
      console.error("Error updating customer status:", error);
      alert("Error updating customer status");
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      client:
        "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25",
      salesAgent:
        "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25",
      admin:
        "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/25",
    };
    return (
      colors[role] || "bg-gradient-to-r from-slate-500 to-gray-600 text-white"
    );
  };

  const getRoleBadge = (role) => {
    const roles = {
      client: "👤 Client",
      salesAgent: "💼 Sales Agent",
      admin: "⚡ Administrator",
    };
    return roles[role] || role;
  };

  const getStatusColor = (isActive) => {
    return isActive
      ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25"
      : "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25";
  };

  const getAvatarBackground = (index) => {
    const colors = [
      "bg-gradient-to-r from-cyan-500 to-blue-500",
      "bg-gradient-to-r from-purple-500 to-indigo-500",
      "bg-gradient-to-r from-emerald-500 to-teal-500",
      "bg-gradient-to-r from-amber-500 to-orange-500",
      "bg-gradient-to-r from-rose-500 to-pink-500",
      "bg-gradient-to-r from-violet-500 to-purple-500",
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4 shadow-lg"></div>
          <p className="text-slate-700 font-medium text-lg">
            Loading Customers...
          </p>
          <p className="text-slate-500 text-sm mt-2">
            Please wait while we fetch customer data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-700 bg-clip-text text-transparent mb-3">
            Customers Management
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Manage your customer database and gain valuable insights into
            customer behavior
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 mb-8"
        >
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-6 items-end">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Search Customers
                  </label>
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white/80 shadow-sm transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Filter by Role
                  </label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white/80 shadow-sm transition-all duration-200"
                  >
                    <option value="">All Roles</option>
                    <option value="client">👤 Clients</option>
                    <option value="salesAgent">💼 Sales Agents</option>
                    <option value="admin">⚡ Administrators</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Filter by Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white/80 shadow-sm transition-all duration-200"
                  >
                    <option value="">All Status</option>
                    <option value="active">🟢 Active</option>
                    <option value="inactive">🔴 Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-sm font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30"
                >
                  <i className="fas fa-search"></i>
                  Search
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all duration-200 shadow-sm"
                >
                  <i className="fas fa-sync-alt"></i>
                  Reset
                </button>
              </div>
            </div>
          </form>
        </motion.div>

        {/* Customers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {customers.length > 0 ? (
            customers.map((customer, index) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="group bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div
                      className={`relative ${getAvatarBackground(
                        index
                      )} rounded-2xl p-1 shadow-lg`}
                    >
                      <img
                        src={
                          customer.avatar ||
                          `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&h=100&q=80&crop=face&facepad=2`
                        }
                        alt={customer.name}
                        className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-inner"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                      <div
                        className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg ${getAvatarBackground(
                          index
                        )} hidden`}
                      >
                        {customer.name?.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
                        {customer.name}
                      </h3>
                      <p className="text-sm text-slate-600">{customer.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getRoleColor(
                        customer.role
                      )}`}
                    >
                      {getRoleBadge(customer.role)}
                    </span>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(
                        customer.isActive
                      )}`}
                    >
                      {customer.isActive ? "🟢 Active" : "🔴 Inactive"}
                    </span>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="space-y-3 mb-6">
                  {customer.phone && (
                    <div className="flex justify-between items-center p-3 bg-slate-50/80 rounded-xl">
                      <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <i className="fas fa-phone text-cyan-600"></i>
                        Phone
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {customer.phone}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center p-3 bg-slate-50/80 rounded-xl">
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <i className="fas fa-shopping-bag text-purple-600"></i>
                      Total Orders
                    </span>
                    <span className="text-sm font-bold text-slate-900 bg-white px-2 py-1 rounded-lg shadow-sm">
                      {customer.stats?.orderCount || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50/80 rounded-xl">
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <i className="fas fa-coins text-amber-600"></i>
                      Total Spent
                    </span>
                    <span className="text-sm font-bold text-emerald-700 bg-white px-2 py-1 rounded-lg shadow-sm">
                      {formatCurrency(customer.stats?.totalSpent || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50/80 rounded-xl">
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <i className="fas fa-calendar text-blue-600"></i>
                      Member Since
                    </span>
                    <span className="text-sm text-slate-600 font-medium">
                      {formatDate(customer.createdAt)}
                    </span>
                  </div>
                  {customer.lastLogin && (
                    <div className="flex justify-between items-center p-3 bg-slate-50/80 rounded-xl">
                      <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <i className="fas fa-sign-in-alt text-green-600"></i>
                        Last Login
                      </span>
                      <span className="text-sm text-slate-600 font-medium">
                        {formatDate(customer.lastLogin)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2">
                    <i className="fas fa-eye"></i>
                    View Profile
                  </button>
                  <button
                    onClick={() =>
                      updateCustomerStatus(customer.id, !customer.isActive)
                    }
                    className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2 ${
                      customer.isActive
                        ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-amber-500/25"
                        : "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-emerald-500/25"
                    }`}
                  >
                    <i
                      className={`fas ${
                        customer.isActive ? "fa-pause" : "fa-play"
                      }`}
                    ></i>
                    {customer.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all duration-200 shadow-sm">
                    <i className="fas fa-envelope"></i>
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-3 text-center py-16"
            >
              <div className="w-24 h-24 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <i className="fas fa-users text-3xl text-cyan-600"></i>
              </div>
              <h3 className="text-2xl font-bold text-slate-700 mb-3">
                No Customers Found
              </h3>
              <p className="text-slate-500 text-lg mb-6">
                {searchTerm
                  ? "Try adjusting your search terms or filters"
                  : "Start building your customer database"}
              </p>
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-cyan-500/25"
              >
                <i className="fas fa-sync-alt mr-2"></i>
                Reset Filters
              </button>
            </motion.div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mt-12"
          >
            <div className="flex gap-2 bg-white/90 backdrop-blur-xl rounded-2xl p-2 shadow-lg border border-white/20">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() =>
                      fetchCustomers(page, searchTerm, roleFilter, statusFilter)
                    }
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      currentPage === page
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>
          </motion.div>
        )}

        {/* Customer Stats Summary */}
        {customers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8"
          >
            <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-6 text-center">
              Customer Insights Dashboard
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {[
                {
                  label: "Total Users",
                  value: customers.length,
                  color: "from-slate-500 to-gray-600",
                  icon: "👥",
                },
                {
                  label: "Clients",
                  value: customers.filter((c) => c.role === "client").length,
                  color: "from-cyan-500 to-blue-600",
                  icon: "👤",
                },
                {
                  label: "Sales Agents",
                  value: customers.filter((c) => c.role === "salesAgent")
                    .length,
                  color: "from-purple-500 to-indigo-600",
                  icon: "💼",
                },
                {
                  label: "Active Users",
                  value: customers.filter((c) => c.isActive).length,
                  color: "from-emerald-500 to-green-600",
                  icon: "🟢",
                },
                {
                  label: "Total Orders",
                  value: customers.reduce(
                    (sum, c) => sum + (c.stats?.orderCount || 0),
                    0
                  ),
                  color: "from-amber-500 to-orange-600",
                  icon: "📦",
                },
                {
                  label: "Total Revenue",
                  value: formatCurrency(
                    customers.reduce(
                      (sum, c) => sum + (c.stats?.totalSpent || 0),
                      0
                    )
                  ),
                  color: "from-green-500 to-emerald-600",
                  icon: "💰",
                },
              ].map((stat, index) => (
                <div key={stat.label} className="text-center group">
                  <div
                    className={`bg-gradient-to-r ${stat.color} rounded-2xl p-1 shadow-lg mb-3 transform group-hover:scale-105 transition-all duration-200`}
                  >
                    <div className="bg-white rounded-xl p-4">
                      <div className="text-2xl mb-2">{stat.icon}</div>
                      <div className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                        {stat.value}
                      </div>
                      <div className="text-xs font-semibold text-slate-600 mt-1">
                        {stat.label}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CustomersPage;
