import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import EmergencyRequest from './pages/EmergencyRequest';
import Tracking from './pages/Tracking';
import AmbulanceDashboard from './pages/AmbulanceDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/emergency" element={<EmergencyRequest />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/dashboard" element={<AmbulanceDashboard />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
