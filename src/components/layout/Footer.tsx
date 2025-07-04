import React from 'react'
import { Heart, Github, Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8 container-mobile">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Heart className="h-4 w-4 text-red-400 mr-2" />
            <p className="text-gray-400">
              Créé avec passion par des joueurs de Magic: The Gathering
            </p>
          </div>
          
          <div className="flex items-center justify-center space-x-6 mb-4">
            <a 
              href="mailto:contact@mtgjudge.app" 
              className="text-gray-400 hover:text-white transition-colors flex items-center"
            >
              <Mail className="h-4 w-4 mr-1" />
              Contact
            </a>
            <a 
              href="https://github.com/mtgjudge" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors flex items-center"
            >
              <Github className="h-4 w-4 mr-1" />
              GitHub
            </a>
          </div>
          
          <div className="text-sm text-gray-500">
            <p className="mb-2">
              MTG Judge Platform - Plateforme non officielle pour la communauté Magic: The Gathering
            </p>
            <p>
              Magic: The Gathering est une marque déposée de Wizards of the Coast LLC
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}