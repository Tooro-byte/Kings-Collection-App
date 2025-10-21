import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Landing from "./components/Landing";
import Login from "./components/Login";
import Signup from "./components/Signup";
import ClientDashboard from "./components/ClientDashboard";
import AdminDashboard from "./components/AdminDashboard";
import SalesDashboard from "./components/SalesDashboard";
import UpdateProduct from "./components/UpdateProduct";
import AddProduct from "./components/AddProduct";
import OrdersPage from "./components/OrdersPage";
import CustomersPage from "./components/CustomersPage";
import StockProducts from "./components/stockProducts";
import Cart from "./components/Cart";
import Payments from "./components/Payments";
import CustomerOrders from "./components/CustomerOrders";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/client" element={<ClientDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/sales" element={<SalesDashboard />} />
          <Route path="/products" element={<StockProducts />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/payment" element={<Payments />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/orders" element={<CustomerOrders />} />

          {/* Add new product/category */}
          <Route path="/add-product" element={<AddProduct />} />

          {/* Update existing product/category */}
          <Route path="/update-product" element={<UpdateProduct />} />

          <Route path="/admin/orders" element={<OrdersPage />} />
          <Route path="/admin/customers" element={<CustomersPage />} />

          {/* Catch-all for 404 */}
          <Route path="*" element={<div>Page Not Found</div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
