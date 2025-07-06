import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Sparkles, Bell, User, LogOut, Crown, Star, Settings } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'
import { NotificationCenter } from '../notifications/NotificationCenter'

export function Header() {
  const { user, signOut } = useAuth()
  const location = useLocation()

  const navigation = [
    { name: user ? 'Dashboard' : 'Accueil', href: '/', current: location.pathname === '/' },
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
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold text-white">
                    Juudge!
                  </h1>
                  <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                    ALPHA
                  </span>
                </div>
                <p className="text-xs text-gray-400 -mt-1">🎯 Appelez un juge MTG !</p>
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
                <div className="hidden sm:block">
                  <NotificationCenter />
                </div>
                <Link to="/profile">
                  <Button variant="ghost" size="sm" className="hidden sm:flex">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
                <div className="hidden md:flex items-center space-x-3">
                  <div className="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-2 max-w-[200px]">
                    {getRoleIcon(user.profile?.role || 'user')}
                    <span className="text-sm text-gray-300 truncate">
                      {user.profile?.full_name || user.email}
                    </span>
                    {user.profile?.role === 'judge' && (
                      <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                        JUGE
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={signOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
                <div className="md:hidden flex items-center space-x-2">
                  <div className="flex items-center space-x-1 bg-gray-800 rounded-lg px-2 py-1">
                    {getRoleIcon(user.profile?.role || 'user')}
                    <span className="text-xs text-gray-300 max-w-[80px] truncate">
                      {user.profile?.full_name?.split(' ')[0] || user.email.split('@')[0]}
                    </span>
                  </div>
                  <Link to="/profile">
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </Link>
                  <div className="sm:hidden">
                    <NotificationCenter />
                  </div>
                  <Button variant="ghost" size="sm" onClick={signOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
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