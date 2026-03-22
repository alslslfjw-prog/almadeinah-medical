import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import WhatsAppButton from './components/WhatsAppButton';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuthListener } from './hooks/useAuth';
import useAuthStore from './store/authStore';
import { STAFF_ROLES } from './lib/roles';

// ── Public Pages ────────────────────────────────────────────────────────────
import Home from './pages/Home';
import Doctors from './pages/Doctors';
import DoctorDetails from './pages/DoctorDetails';
import Scans from './pages/Scans';
import ScanDetails from './pages/ScanDetails';
import Clinics from './pages/Clinics';
import ClinicDetails from './pages/ClinicDetails';
import Examinations from './pages/Examinations';
import ExaminationDetails from './pages/ExaminationDetails';
import About from './pages/About';
import EquipmentDetails from './pages/EquipmentDetails';
import AllTests from './pages/AllTests';
import Packages from './pages/Packages';
import PackageDetails from './pages/PackageDetails';
import Blog from './pages/Blog';
import BlogDetails from './pages/BlogDetails';
import Checkout from './pages/Checkout';

// ── Auth Pages ──────────────────────────────────────────────────────────────
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';

// ── Dashboard Layouts ───────────────────────────────────────────────────────
import PatientLayout from './pages/dashboards/patient/PatientLayout';
import AdminLayout from './pages/dashboards/admin/AdminLayout';
import BlogCMS from './pages/dashboards/admin/BlogCMS';
import DoctorsAdmin from './pages/dashboards/admin/DoctorsAdmin';
import ClinicsAdmin from './pages/dashboards/admin/ClinicsAdmin';
import ScansAdmin from './pages/dashboards/admin/ScansAdmin';
import LabTestsCMS from './pages/dashboards/admin/LabTestsCMS';
import AppointmentsAdmin from './pages/dashboards/admin/AppointmentsAdmin';
import AdminOverview from './pages/dashboards/admin/AdminOverview';
import PaymentGatewaysCMS from './pages/dashboards/admin/PaymentGatewaysCMS';
import PackagesCMS from './pages/dashboards/admin/PackagesCMS';
import SettingsCMS from './pages/dashboards/admin/SettingsCMS';
import FinanceDashboard from './pages/dashboards/admin/FinanceDashboard';
import UsersAdmin from './pages/dashboards/admin/UsersAdmin';


/**
 * AuthInitializer — registers the Supabase auth listener EXACTLY ONCE.
 * Kept as a component so it can be mounted inside Router context if needed,
 * but useAuthListener is also called directly in App() to avoid chicken-and-egg
 * with the isLoading guard.
 */
function AuthInitializer() {
  useAuthListener();
  return null;
}

/**
 * PublicLayout — wraps all public-facing pages with Navbar + Footer.
 *
 * KEY: This is a STABLE component used as a react-router parent route element.
 * Because it is declared outside App() and referenced by identity (not inline),
 * React never recreates it on re-renders. The <Outlet> inside it swaps the
 * child page while Navbar/Footer/WhatsAppButton stay mounted.
 *
 * Previously, the public layout was an INLINE JSX element inside a wildcard
 * path="*" route. Every time auth state (isLoading) caused App to re-render,
 * React destroyed that inline element and recreated it — remounting all child
 * pages and resetting their hook state (doctors=[], clinics=[], etc.).
 */
function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <WhatsAppButton />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

// ── Admin Placeholder components ─────────────────────────────────────────────
function AdminStub({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">🚧</div>
      <p className="font-semibold text-slate-600">{title}</p>
      <p className="text-sm">هذه الصفحة قيد الإنشاء</p>
    </div>
  );
}

function AdminOverviewStub() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
      <div className="text-4xl">📊</div>
      <p className="font-semibold text-slate-600">لوحة التحكم الرئيسية</p>
      <p className="text-sm">قيد الإنشاء — اختر قسماً من الشريط الجانبي</p>
    </div>
  );
}

function App() {
  // ── Auth listener registered FIRST — unconditionally, before any guard ──────
  useAuthListener();
  const isAuthLoading = useAuthStore(s => s.isLoading);

  // Block ALL route rendering until session is resolved
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
          <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-400 tracking-wide">جارٍ تحميل الجلسة...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>

        {/* ── Auth routes (no Navbar/Footer) ────────────────────────────── */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ── Patient dashboard (protected) ─────────────────────────────── */}
        <Route
          path="/dashboard/patient/*"
          element={
            <ProtectedRoute allowedRoles={['patient', 'admin']}>
              <PatientLayout />
            </ProtectedRoute>
          }
        />

        {/* ── Admin dashboard (protected, nested routes) ─────────────────── */}
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={STAFF_ROLES}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="appointments" element={<AppointmentsAdmin />} />
          <Route path="finance" element={<FinanceDashboard />} />
          <Route path="cms/blog" element={<BlogCMS />} />
          <Route path="cms/clinics" element={<ClinicsAdmin />} />
          <Route path="cms/labs" element={<LabTestsCMS />} />
          <Route path="cms/packages" element={<PackagesCMS />} />
          <Route path="doctors" element={<DoctorsAdmin />} />
          <Route path="users" element={<UsersAdmin />} />
          <Route path="gateways" element={<PaymentGatewaysCMS />} />
          <Route path="settings" element={<SettingsCMS />} />
          <Route path="cms/scans" element={<ScansAdmin />} />
        </Route>

        {/* ── Public routes (stable PublicLayout parent — NEVER remounts) ── */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/doctors/:id" element={<DoctorDetails />} />
          <Route path="/scans" element={<Scans />} />
          <Route path="/scans/:id" element={<ScanDetails />} />
          <Route path="/clinics" element={<Clinics />} />
          <Route path="/clinics/:id" element={<ClinicDetails />} />
          <Route path="/examinations" element={<Examinations />} />
          <Route path="/examinations/:id" element={<ExaminationDetails />} />
          <Route path="/examinations/all-tests" element={<AllTests />} />
          <Route path="/examinations/packages" element={<Packages />} />
          <Route path="/examinations/packages/:id" element={<PackageDetails />} />
          <Route path="/equipments/:id" element={<EquipmentDetails />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:id" element={<BlogDetails />} />
          <Route path="/about" element={<About />} />
          <Route path="/checkout" element={<Checkout />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;
