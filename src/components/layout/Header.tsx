import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Sparkles, Bell, User, LogOut, Crown, Star } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'

export function Header() {
  const { user, signOut } = useAuth()
  const location = useLocation()

  const navigation = [
    { name: 'Accueil', href: '/', current: location.pathname === '/' },
    { name: 'Questions', href: '/questions', current: location.pathname === '/questions' },
    { name: 'Juges', href: '/judges', current: location.pathname === '/judges' },
  ]

  if (user?.profile?.role === 'judge') {
    navigation.push({ 
      name: 'Mes Assignations', 
      href: '/judge/assignments', 
      current: location.pathname === '/judge/assignments' 
    })
  }

  if (user?.profile?.role === 'admin') {
    navigation.push({ 
      name: 'Administration', 
      href: '/admin', 
      current: location.pathname === '/admin' 
    })
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'judge':
        return <Crown className="h-4 w-4 text-yellow-400" />
      case 'admin':
        return <Star className="h-4 w-4 text-purple-400" />
      default:
        return <User className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <header className="bg-slate-900/95 backdrop-blur-sm shadow-lg border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 container-mobile">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center group">
              <Sparkles className="h-8 w-8 text-blue-400 group-hover:text-blue-300 transition-colors" />
              <div className="ml-3">
                <h1 className="text-xl font-bold text-white">
                  MTG Judge
                </h1>
                <p className="text-xs text-gray-400 -mt-1">Magic: The Gathering</p>
              </div>
            </Link>
          </div>

          <nav className="hidden lg:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  item.current
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-300 hover:text-white'
                } px-3 py-2 text-sm font-medium transition-colors relative group`}
              >
                {item.name}
                {!item.current && (
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></span>
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
                </Button>
                <div className="hidden sm:flex items-center space-x-3">
                  <div className="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-2">
                    {getRoleIcon(user.profile?.role || 'user')}
                    <span className="text-sm text-gray-300">
                      {user.profile?.full_name || user.email}
                    </span>
                    {user.profile?.role === 'judge' && (
                      <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-medium">
                        JUGE
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={signOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
                <div className="sm:hidden">
                  <Button variant="ghost" size="sm" onClick={signOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2 flex-col sm:flex-row gap-2 sm:gap-2">
                <Link to="/login">
                  <Button variant="outline" size="sm">Connexion</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Inscription</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}