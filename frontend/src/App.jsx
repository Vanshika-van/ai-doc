import { Route, Routes } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import AuthPage from './pages/AuthPage'
import Home from './pages/Home'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
    </Routes>
  )
}