import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import WhatsAppButton from './components/WhatsAppButton'; // Import the WhatsApp button component
import Footer from './components/Footer';
import Home from './pages/Home';
import Doctors from './pages/Doctors';
import DoctorDetails from './pages/DoctorDetails';
import ScanDetails from './pages/ScanDetails';
import Scans from './pages/Scans'; // <--- This was likely missing!
import Checkout from './pages/Checkout';
import Clinics from './pages/Clinics';
import Examinations from './pages/Examinations';
import About from './pages/About';
import EquipmentDetails from './pages/EquipmentDetails';
import ClinicDetails from './pages/ClinicDetails'; // Import the new page
import ExaminationDetails from './pages/ExaminationDetails'; // Import the new page
import AllTests from './pages/AllTests';
import Packages from './pages/Packages'; // Import the new page
import PackageDetails from './pages/PackageDetails'; // Import the new page
import Blog from './pages/Blog';
import BlogDetails from './pages/BlogDetails';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <WhatsAppButton /> {/* Add the WhatsApp button to the app */}
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            
            {/* Doctor Routes */}
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/doctors/:id" element={<DoctorDetails />} />
            
            {/* Scan Routes */}
            <Route path="/scans" element={<Scans />} />
            <Route path="/scans/:id" element={<ScanDetails />} />
            
            {/* Checkout */}
            <Route path="/checkout" element={<Checkout />} />

        
            {/* Clinics */}
            <Route path="/clinics" element={<Clinics />} />
            {/* ✅ Add this new route */}   
           <Route path="/clinics/:id" element={<ClinicDetails />} />
            {/* Examinations */}
            <Route path="/examinations" element={<Examinations />} />
           {/* ✅ Add this new route */}
           <Route path="/examinations/:id" element={<ExaminationDetails />} />
            {/* All Tests */}
            <Route path="/examinations/all-tests" element={<AllTests />} />
            {/* About */}
            <Route path="/about" element={<About />} />

            {/* Equipment Details */}
              <Route path="/equipments/:id" element={<EquipmentDetails />} />
            {/* Packages */}
              <Route path="/examinations/packages" element={<Packages />} />
              <Route path="/examinations/packages/:id" element={<PackageDetails />} /> {/* الرابط الجديد */}
            

             {/* Blog */}
             <Route path="/blog" element={<Blog />} />
             <Route path="/blog/:id" element={<BlogDetails />} />
            
          
            
          </Routes>
        </main>
        <Footer />
       
      </div>
    </Router>
  );
}

export default App;