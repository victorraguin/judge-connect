import React, { useState, useEffect } from 'react'
import { Search, X, ExternalLink, Plus } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface Card {
  id: string
  name: string
  mana_cost?: string
  type_line: string
  oracle_text?: string
  image_uris?: {
    small: string
    normal: string
    large: string
  }
  scryfall_uri: string
  set_name: string
  rarity: string
}

interface CardSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectCard: (card: Card) => void
}

export function CardSearchModal({ isOpen, onClose, onSelectCard }: CardSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (searchTerm.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchCards(searchTerm)
      }, 500)
      return () => clearTimeout(timeoutId)
    } else {
      setCards([])
    }
  }, [searchTerm])

  const searchCards = async (query: string) => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=name&unique=cards`
      )

      if (!response.ok) {
        if (response.status === 404) {
          setCards([])
          return
        }
        throw new Error('Erreur lors de la recherche')
      }

      const data = await response.json()
      setCards(data.data?.slice(0, 20) || [])
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la recherche')
      setCards([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCard = (card: Card) => {
    onSelectCard(card)
    onClose()
    setSearchTerm('')
    setCards([])
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'mythic':
        return 'text-orange-400'
      case 'rare':
        return 'text-yellow-400'
      case 'uncommon':
        return 'text-gray-300'
      case 'common':
        return 'text-gray-500'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rechercher une carte MTG" size="lg">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Nom de la carte (ex: Lightning Bolt, Counterspell...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 block w-full rounded-lg bg-gray-800 border-gray-600 text-white placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base min-h-[44px] px-4 py-3"
            autoFocus
          />
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
            <p className="text-gray-400">Recherche en cours...</p>
          </div>
        )}

        {searchTerm.length >= 2 && !loading && cards.length === 0 && !error && (
          <div className="text-center py-8">
            <p className="text-gray-400">Aucune carte trouvée pour "{searchTerm}"</p>
          </div>
        )}

        {cards.length > 0 && (
          <div className="max-h-96 overflow-y-auto space-y-3">
            {cards.map((card) => (
              <div
                key={card.id}
                className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer"
                onClick={() => handleSelectCard(card)}
              >
                <div className="flex items-start space-x-4">
                  {card.image_uris?.small && (
                    <img
                      src={card.image_uris.small}
                      alt={card.name}
                      className="w-16 h-22 object-cover rounded border border-gray-600 flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-white text-sm">
                        {card.name}
                      </h3>
                      <Button size="sm" variant="ghost">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {card.mana_cost && (
                      <p className="text-xs text-gray-400 mb-1">
                        Coût: {card.mana_cost}
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-400 mb-2">
                      {card.type_line}
                    </p>
                    
                    {card.oracle_text && (
                      <p className="text-xs text-gray-300 line-clamp-3 mb-2">
                        {card.oracle_text}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        {card.set_name}
                      </span>
                      <span className={`font-medium ${getRarityColor(card.rarity)}`}>
                        {card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-500 text-center">
          Données fournies par{' '}
          <a
            href="https://scryfall.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            Scryfall
          </a>
        </div>
      </div>
    </Modal>
  )
}