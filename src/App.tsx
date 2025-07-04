import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { HomePage } from './pages/HomePage'
import { DashboardPage } from './pages/DashboardPage'
import { QuestionsPage } from './pages/QuestionsPage'
import { JudgesPage } from './pages/JudgesPage'
import { LoginForm } from './components/auth/LoginForm'
import { RegisterForm } from './components/auth/RegisterForm'
import { useAuth } from './contexts/AuthContext'

const queryClient = new QueryClient()

function App() {
  const { user } = useAuth()

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={user ? <DashboardPage /> : <HomePage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/questions" element={<QuestionsPage />} />
              <Route path="/judges" element={<JudgesPage />} />
              <Route path="/login" element={<LoginForm />} />
              <Route path="/register" element={<RegisterForm />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App