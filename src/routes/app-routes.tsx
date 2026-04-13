import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { DashboardLayout } from '../layouts/dashboard-layout'
import {
  adminLinks,
  agentLinks,
  superadminLinks,
} from '../layouts/dashboard-navigation'
import { MarketingLayout } from '../layouts/marketing-layout'
import { RouteGuard } from './route-guard'
import { ReferralCapture } from './referral-capture'
import { HomePage } from '../pages/public/home-page'
import { ShopPage } from '../pages/public/shop-page'
import { ProductPage } from '../pages/public/product-page'
import { CartPage } from '../pages/public/cart-page'
import { CheckoutPage } from '../pages/public/checkout-page'
import { LoginPage } from '../pages/shared/login-page'
import { RegisterPage } from '../pages/shared/register-page'
import { SetupPage } from '../pages/shared/setup-page'
import { NotFoundPage } from '../pages/shared/not-found-page'
import { CustomerDashboardPage } from '../pages/customer/customer-dashboard-page'
import { CustomerOrdersPage } from '../pages/customer/customer-orders-page'
import { CustomerProfilePage } from '../pages/customer/customer-profile-page'
import { AdminDashboardPage } from '../pages/admin/admin-dashboard-page'
import { ProductsPage } from '../pages/admin/products-page'
import { CategoriesPage } from '../pages/admin/categories-page'
import { OrdersPage } from '../pages/admin/orders-page'
import { OrderDetailPage } from '../pages/admin/order-detail-page'
import { PosPage } from '../pages/admin/pos-page'
import { AnalyticsPage } from '../pages/admin/analytics-page'
import { InventoryPage } from '../pages/admin/inventory-page'
import { AgentsPage } from '../pages/admin/agents-page'
import { SuperadminDashboardPage } from '../pages/superadmin/superadmin-dashboard-page'
import { StoresPage } from '../pages/superadmin/stores-page'
import { AdminAccountsPage } from '../pages/superadmin/admin-accounts-page'
import { BrandingManagerPage } from '../pages/superadmin/branding-manager-page'
import { SupportPage } from '../pages/superadmin/support-page'
import { AgentDashboardPage } from '../pages/agent/agent-dashboard-page'
import { ReferralsPage } from '../pages/agent/referrals-page'
import { CommissionsPage } from '../pages/agent/commissions-page'
import { PayoutsPage } from '../pages/agent/payouts-page'
import { AgentProfilePage } from '../pages/agent/agent-profile-page'

export function AppRoutes() {
  return (
    <BrowserRouter>
      <ReferralCapture />
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/products/:slug" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/setup" element={<SetupPage />} />
        </Route>

        <Route element={<RouteGuard allow={['customer']} />}>
          <Route element={<MarketingLayout />}>
            <Route path="/account" element={<CustomerDashboardPage />} />
            <Route path="/account/orders" element={<CustomerOrdersPage />} />
            <Route path="/account/profile" element={<CustomerProfilePage />} />
          </Route>
        </Route>

        <Route element={<RouteGuard allow={['admin']} />}>
          <Route
            element={
              <DashboardLayout
                title="Store Admin"
                description="Manage products, categories, orders, POS, analytics, inventory, and agents for the assigned store."
                links={adminLinks}
              />
            }
          >
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/products" element={<ProductsPage />} />
            <Route path="/admin/categories" element={<CategoriesPage />} />
            <Route path="/admin/orders" element={<OrdersPage />} />
            <Route path="/admin/orders/:orderId" element={<OrderDetailPage />} />
            <Route path="/admin/pos" element={<PosPage />} />
            <Route path="/admin/analytics" element={<AnalyticsPage />} />
            <Route path="/admin/inventory" element={<InventoryPage />} />
            <Route path="/admin/agents" element={<AgentsPage />} />
          </Route>
        </Route>

        <Route element={<RouteGuard allow={['superadmin']} />}>
          <Route
            element={
              <DashboardLayout
                title="Superadmin"
                description="Set up the single store, assign the owner/admin, and control the website and white-label presentation."
                links={superadminLinks}
              />
            }
          >
            <Route path="/superadmin" element={<SuperadminDashboardPage />} />
            <Route path="/superadmin/stores" element={<StoresPage />} />
            <Route path="/superadmin/admins" element={<AdminAccountsPage />} />
            <Route path="/superadmin/branding" element={<BrandingManagerPage />} />
            <Route path="/superadmin/support" element={<SupportPage />} />
          </Route>
        </Route>

        <Route element={<RouteGuard allow={['agent']} />}>
          <Route
            element={
              <DashboardLayout
                title="Agent Portal"
                description="Referral visibility, commissions, and payout history without admin privileges."
                links={agentLinks}
              />
            }
          >
            <Route path="/agent" element={<AgentDashboardPage />} />
            <Route path="/agent/referrals" element={<ReferralsPage />} />
            <Route path="/agent/commissions" element={<CommissionsPage />} />
            <Route path="/agent/payouts" element={<PayoutsPage />} />
            <Route path="/agent/profile" element={<AgentProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
