import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchCustomers = async (page = 1, search = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
      });

      const response = await fetch(`/api/admin/customers?${params}`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers);
        setTotalPages(data.totalPages);
        setCurrentPage(data.currentPage);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
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
    fetchCustomers(1, searchTerm);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading Customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Customers Management
          </h1>
          <p className="text-slate-600">
            Manage your customer database and view customer insights
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <form onSubmit={handleSearch} className="flex gap-4 flex-1">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search customers by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <i className="fas fa-search mr-2"></i>
                Search
              </button>
            </form>
            <button
              onClick={() => {
                setSearchTerm("");
                fetchCustomers();
              }}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <i className="fas fa-sync-alt"></i>
              Reset
            </button>
          </div>
        </div>

        {/* Customers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.length > 0 ? (
            customers.map((customer) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 backdrop-blur-lg rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <img
                    src={
                      customer.avatar ||
                      "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100"
                    }
                    alt={customer.name}
                    className="w-12 h-12 rounded-full border-2 border-blue-500"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {customer.name}
                    </h3>
                    <p className="text-sm text-slate-500">{customer.email}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      customer.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {customer.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Total Orders</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {customer.stats.orderCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Total Spent</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatCurrency(customer.stats.totalSpent)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Member Since</span>
                    <span className="text-sm text-slate-500">
                      {formatDate(customer.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                    View Profile
                  </button>
                  <button className="px-3 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                    <i className="fas fa-envelope"></i>
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-3 text-center py-12">
              <i className="fas fa-users text-4xl text-slate-300 mb-4"></i>
              <p className="text-slate-500">No customers found</p>
              {searchTerm && (
                <p className="text-sm text-slate-400 mt-2">
                  Try adjusting your search terms
                </p>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => fetchCustomers(page, searchTerm)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Customer Stats Summary */}
        {customers.length > 0 && (
          <div className="mt-8 bg-white/80 backdrop-blur-lg rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Customer Insights
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {customers.length}
                </div>
                <div className="text-sm text-slate-600">Total Customers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">
                  {customers.filter((c) => c.isActive).length}
                </div>
                <div className="text-sm text-slate-600">Active Customers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {customers.reduce(
                    (sum, customer) => sum + customer.stats.orderCount,
                    0
                  )}
                </div>
                <div className="text-sm text-slate-600">Total Orders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(
                    customers.reduce(
                      (sum, customer) => sum + customer.stats.totalSpent,
                      0
                    )
                  )}
                </div>
                <div className="text-sm text-slate-600">Total Revenue</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomersPage;
