import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Marketplace from './pages/Marketplace';
import GigDetail from './pages/GigDetail';
import MyGigs from './pages/MyGigs';
import MyJobs from './pages/MyJobs';
import JobDetail from './pages/JobDetail';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import FreelancerProfile from './pages/FreelancerProfile';
import AdminDashboard from './pages/AdminDashboard';
import CreateGig from './pages/CreateGig';
import PostJob from './pages/PostJob';
import StaticPage from './pages/StaticPage';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import Dashboard from './pages/Dashboard';
import AIStoreBuilder from './pages/AIStoreBuilder';
import CreativeStudio from './pages/CreativeStudio';
import PortfolioGallery from './pages/PortfolioGallery';
import AdManager from './pages/AdManager';
import ChooseRole from './pages/ChooseRole';
import BrandPage from './pages/BrandPage';
import EditGig from './pages/EditGig';
import Transactions from './pages/Transactions';
import BusinessDashboard from './pages/BusinessDashboard';
import MyAgents from './pages/MyAgents';
import MyOrders from './pages/MyOrders';
import PurchaseConfirmation from './pages/PurchaseConfirmation';
import Wallet from './pages/Wallet';
import ErrorBoundary from './components/ErrorBoundary';
import PortfolioLanding from './pages/PortfolioLanding';
import { Analytics } from '@vercel/analytics/react';
import WebsiteBuilder from './components/WebsiteBuilder';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gebeya-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  
  return children;
}

function App() {
  return (
    <>
      <Analytics />
    <SocketProvider>
      <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<Home />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/gigs/:id" element={<GigDetail />} />
        <Route path="/freelancers/:id" element={<FreelancerProfile />} />
        <Route path="/choose-role" element={<ChooseRole />} />

        {/* Protected routes */}
        <Route path="/my-gigs" element={
          <ProtectedRoute><Layout><MyGigs /></Layout></ProtectedRoute>
        } />
        <Route path="/create-gig" element={
          <ProtectedRoute><Layout><CreateGig /></Layout></ProtectedRoute>
        } />
        <Route path="/my-jobs" element={
          <ProtectedRoute><Layout><MyJobs /></Layout></ProtectedRoute>
        } />
        <Route path="/jobs/:id" element={
          <ProtectedRoute><Layout><JobDetail /></Layout></ProtectedRoute>
        } />
        <Route path="/post-job" element={
          <ProtectedRoute roles={['client']}><Layout><PostJob /></Layout></ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute><Layout><Messages /></Layout></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute><Layout><AdminDashboard /></Layout></ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute><Layout><AnalyticsDashboard /></Layout></ProtectedRoute>
        } />
        <Route path="/ai-store" element={
          <ProtectedRoute><Layout><AIStoreBuilder /></Layout></ProtectedRoute>
        } />
        <Route path="/creative-studio" element={
          <ProtectedRoute><Layout><CreativeStudio /></Layout></ProtectedRoute>
        } />
        <Route path="/ads" element={
          <ProtectedRoute><Layout><AdManager /></Layout></ProtectedRoute>
        } />
        <Route path="/portfolio/:userId" element={
          <Layout><PortfolioGallery /></Layout>
        } />
        <Route path="/brand" element={
          <ProtectedRoute><Layout><BrandPage /></Layout></ProtectedRoute>
        } />
        <Route path="/edit-gig/:id" element={
          <ProtectedRoute><Layout><EditGig /></Layout></ProtectedRoute>
        } />
        <Route path="/transactions" element={
          <ProtectedRoute><Layout><Transactions /></Layout></ProtectedRoute>
        } />
        <Route path="/business" element={
          <ProtectedRoute><Layout><BusinessDashboard /></Layout></ProtectedRoute>
        } />
        <Route path="/agents" element={
          <ProtectedRoute><Layout><MyAgents /></Layout></ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute><Layout><MyOrders /></Layout></ProtectedRoute>
        } />
        <Route path="/orders/:id" element={
          <ProtectedRoute><Layout><MyOrders /></Layout></ProtectedRoute>
        } />
        <Route path="/confirm-purchase/:jobId" element={
          <ProtectedRoute><Layout><PurchaseConfirmation /></Layout></ProtectedRoute>
        } />
        {/* Wallet is publicly accessible — has its own LoginGate for unauthenticated users */}
        <Route path="/wallet" element={
          <Layout><Wallet /></Layout>
        } />
        
        {/* Portfolio Landing Page */}
        <Route path="/portfolio" element={<PortfolioLanding />} />

        {/* Website Builder */}
        <Route path="/website-builder" element={
          <ProtectedRoute><Layout><WebsiteBuilder /></Layout></ProtectedRoute>
        } />

        {/* Static pages — must be LAST route */}
        <Route path="/:page" element={<StaticPage />} />
      </Routes>
      </ErrorBoundary>
    </SocketProvider>
    </>
  );
}

export default App;
