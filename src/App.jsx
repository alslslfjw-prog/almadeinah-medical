import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import WhatsAppButton from './components/WhatsAppButton';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuthListener } from './hooks/useAuth';

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

// ── Dashboard Layouts ───────────────────────────────────────────────────────
import PatientLayout from './pages/dashboards/patient/PatientLayout';
import AdminLayout from './pages/dashboards/admin/AdminLayout';
import BlogCMS from './pages/dashboards/admin/BlogCMS';
import DoctorsAdmin from './pages/dashboards/admin/DoctorsAdmin';
import ClinicsAdmin from './pages/dashboards/admin/ClinicsAdmin';
import ScansAdmin from './pages/dashboards/admin/ScansAdmin';
import LabsAdmin from './pages/dashboards/admin/LabsAdmin';

/**
 * AuthInitializer — registers the Supabase auth listener EXACTLY ONCE,
 * at the app root. This component never unmounts, so the subscription
 * is permanent for the app lifetime.
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
  return (
    <Router>
      {/* Auth listener — registered once, never unmounts */}
      <AuthInitializer />

      <Routes>

        {/* ── Auth routes (no Navbar/Footer) ────────────────────────────── */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

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
            <ProtectedRoute allowedRoles="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminOverviewStub />} />
          <Route path="appointments" element={<AdminStub title="المواعيد" />} />
          <Route path="finance"      element={<AdminStub title="المالية" />} />
          <Route path="cms/blog"     element={<BlogCMS />} />
          <Route path="cms/clinics"  element={<ClinicsAdmin />} />
          <Route path="cms/labs"     element={<LabsAdmin />} />
          <Route path="cms/packages" element={<LabsAdmin />} />
          <Route path="doctors"      element={<DoctorsAdmin />} />
          <Route path="users"        element={<AdminStub title="إدارة المستخدمين" />} />
          <Route path="gateways"     element={<AdminStub title="بوابات الدفع" />} />
        </Route>

        {/* ── Public routes (stable PublicLayout parent — NEVER remounts) ── */}
        <Route element={<PublicLayout />}>
          <Route path="/"                          element={<Home />} />
          <Route path="/doctors"                   element={<Doctors />} />
          <Route path="/doctors/:id"               element={<DoctorDetails />} />
          <Route path="/scans"                     element={<Scans />} />
          <Route path="/scans/:id"                 element={<ScanDetails />} />
          <Route path="/clinics"                   element={<Clinics />} />
          <Route path="/clinics/:id"               element={<ClinicDetails />} />
          <Route path="/examinations"              element={<Examinations />} />
          <Route path="/examinations/:id"          element={<ExaminationDetails />} />
          <Route path="/examinations/all-tests"    element={<AllTests />} />
          <Route path="/examinations/packages"     element={<Packages />} />
          <Route path="/examinations/packages/:id" element={<PackageDetails />} />
          <Route path="/equipments/:id"            element={<EquipmentDetails />} />
          <Route path="/blog"                      element={<Blog />} />
          <Route path="/blog/:id"                  element={<BlogDetails />} />
          <Route path="/about"                     element={<About />} />
          <Route path="/checkout"                  element={<Checkout />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;
