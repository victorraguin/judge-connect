import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Globe, Lock, Camera, Image as ImageIcon, X, AlertCircle, Search, Plus, Sparkles } from 'lucide-react'
import { CardSearchModal } from '../cards/CardSearchModal'

interface CreateQuestionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface QuestionFormData {
  title: string
  content: string
  category: string
  image_url?: string
  is_public: boolean
  selected_cards?: any[]
}

const categories = [
  'Règles générales',
  'Interactions de cartes',
  'Timing et priorité',
  'Zones de jeu',
  'Types de cartes',
  'Mots-clés et capacités',
  'Combat',
  'Tournois et REL',
  'Formats spécifiques',
  'Autre',
]

export function CreateQuestionModal({ isOpen, onClose, onSuccess }: CreateQuestionModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showCardSearch, setShowCardSearch] = useState(false)
  const [selectedCards, setSelectedCards] = useState<any[]>([])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuestionFormData>({
    defaultValues: {
      is_public: false,
    },
  })

  const isPublic = watch('is_public')
  const contentValue = watch('content')

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('L\'image ne peut pas dépasser 10MB')
        return
      }
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setImagePreview(result)
        setValue('image_url', result)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImagePreview(null)
    setValue('image_url', '')
  }

  const addCard = (card: any) => {
    setSelectedCards(prev => [...prev, card])
  }

  const removeCard = (cardId: string) => {
    setSelectedCards(prev => prev.filter(card => card.id !== cardId))
  }

  const onSubmit = async (data: QuestionFormData) => {
    if (!user) return

    try {
      setLoading(true)
      setError('')

      const { error: insertError } = await supabase
        .from('questions')
        .insert({
          user_id: user.id,
          title: data.title,
          content: data.content,
          category: data.category,
          image_url: data.image_url || null,
          is_public: data.is_public,
        }, {
          metadata: selectedCards.length > 0 ? { cards: selectedCards } : null
        })

      if (insertError) throw insertError

      reset()
      setImagePreview(null)
      setSelectedCards([])
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    setImagePreview(null)
    setSelectedCards([])
    setError('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="" size="xl">
      <div className="space-y-8">
        {/* Custom Header */}
        <div className="text-center pb-6 border-b border-gray-700">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full">
              <Sparkles className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Poser une question MTG</h2>
          <p className="text-gray-400">Obtenez une réponse d'expert de nos juges certifiés</p>
        </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-xl flex items-start backdrop-blur-sm">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-8">
          {/* Title Input */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-white mb-3">
              Titre de votre question <span className="text-red-400">*</span>
            </label>
            <input
              {...register('title', {
                required: 'Le titre est requis',
                maxLength: {
                  value: 200,
                  message: 'Le titre ne peut pas dépasser 200 caractères',
                },
              })}
              placeholder="Ex: Interaction entre Counterspell et Split Second"
              className="block w-full rounded-xl bg-gray-900/50 border-2 border-gray-600 text-white placeholder-gray-400 shadow-lg focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 text-lg transition-all duration-200 min-h-[56px] px-6 py-4 backdrop-blur-sm"
            />
            {errors.title && (
              <p className="text-sm text-red-400 mt-2">{errors.title.message}</p>
            )}
          </div>

          {/* Category Select */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-white mb-3">
              Catégorie <span className="text-red-400">*</span>
            </label>
            <select
              {...register('category', { required: 'La catégorie est requise' })}
              className="block w-full rounded-xl bg-gray-900/50 border-2 border-gray-600 text-white shadow-lg focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 text-lg transition-all duration-200 min-h-[56px] px-6 py-4 backdrop-blur-sm"
            >
              <option value="">Sélectionnez une catégorie</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-400">{errors.category.message}</p>
            )}
          </div>

          {/* Content Textarea */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-white mb-3">
              📝 Description détaillée <span className="text-red-400">*</span>
            </label>
            <textarea
              {...register('content', {
                required: 'La description est requise',
                minLength: {
                  value: 20,
                  message: 'La description doit contenir au moins 20 caractères',
                },
              })}
              rows={6}
              className="block w-full rounded-xl bg-gray-900/50 border-2 border-gray-600 text-white placeholder-gray-400 shadow-lg focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 text-lg transition-all duration-200 min-h-[140px] px-6 py-4 resize-none backdrop-blur-sm hover:border-gray-500"
              placeholder="🎮 Décrivez votre situation comme si vous étiez en tournoi..."
            />
            <div className="flex justify-between items-center mt-1">
              {errors.content && (
                <p className="text-sm text-red-400">{errors.content.message}</p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {contentValue?.length || 0} caractères
              </p>
            </div>
            <p className="text-sm text-gray-400 mt-2 flex items-center">
              <span className="mr-2">💡</span>
              💡 Plus de détails = réponse plus précise
            </p>
          </div>

          {/* Selected Cards */}
          {selectedCards.length > 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-white mb-3">
                Cartes sélectionnées ({selectedCards.length})
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedCards.map((card) => (
                  <div key={card.id} className="bg-gray-900/30 rounded-xl p-4 border border-gray-600 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {card.image_uris?.small && (
                          <img
                            src={card.image_uris.small}
                            alt={card.name}
                            className="w-8 h-11 object-cover rounded border border-gray-500"
                          />
                        )}
                        <div>
                          <h4 className="font-medium text-white text-sm">{card.name}</h4>
                          <p className="text-xs text-gray-400">{card.type_line}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCard(card.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Cards Button */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCardSearch(true)}
              className="w-full py-4 text-lg rounded-xl"
            >
              <Search className="h-4 w-4 mr-2" />
              Ajouter des cartes MTG
            </Button>
            <p className="text-sm text-gray-400 mt-2 flex items-center">
              <span className="mr-2">🃏</span>
              🃏 Ajoutez les cartes impliquées dans votre question pour plus de clarté
            </p>
          </div>

          {/* Image Upload Section */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-white mb-3">
              Image (optionnel)
            </label>
            
            {!imagePreview ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="cursor-pointer group">
                  <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-500/5 transition-all duration-300 group-hover:scale-105">
                    <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2 group-hover:text-blue-400 transition-colors" />
                    <p className="text-sm text-gray-400 mb-1 group-hover:text-gray-300">
                      Sélectionner une image
                    </p>
                    <p className="text-xs text-gray-500">
                      JPG, PNG jusqu'à 10MB
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                
                {/* Mobile Camera Option */}
                <label className="cursor-pointer group sm:hidden">
                  <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-500/5 transition-all duration-300 group-hover:scale-105">
                    <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2 group-hover:text-blue-400 transition-colors" />
                    <p className="text-sm text-gray-400 mb-1 group-hover:text-gray-300">
                      Prendre une photo
                    </p>
                    <p className="text-xs text-gray-500">
                      Appareil photo
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-xl border-2 border-gray-600 shadow-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-3 right-3 p-2 bg-red-500/90 text-white rounded-full hover:bg-red-600 hover:scale-110 transition-all duration-200 backdrop-blur-sm shadow-lg"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-3 left-3 bg-black/70 text-white text-sm px-3 py-2 rounded-lg backdrop-blur-sm">
                  Image ajoutée
                </div>
              </div>
            )}
            
            <p className="text-sm text-gray-400 mt-2 flex items-center">
              <span className="mr-2">📸</span>
              📸 Ajoutez une image pour illustrer votre question (état de jeu, cartes spécifiques, etc.)
            </p>
          </div>

          {/* Visibility Toggle */}
          <div className="bg-gradient-to-r from-gray-800/30 to-gray-700/30 rounded-xl p-6 border border-gray-600 backdrop-blur-sm">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="is_public"
                {...register('is_public')}
                className="h-5 w-5 text-blue-600 bg-gray-700 border-gray-500 rounded focus:ring-blue-500 focus:ring-2 mt-1"
              />
              <div className="flex-1">
                <label htmlFor="is_public" className="flex items-center text-base font-semibold text-white cursor-pointer">
                  {isPublic ? (
                    <Globe className="h-4 w-4 mr-2 text-green-400" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2 text-gray-400" />
                  )}
                  Rendre cette question publique
                </label>
                <p className="text-sm text-gray-400 mt-2">
                  {isPublic 
                    ? "✅ Votre question sera visible par tous et pourra aider la communauté"
                    : "🔒 Seuls vous et le juge assigné pourrez voir cette question"
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-gray-700">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            className="flex-1 sm:flex-none py-4 text-lg rounded-xl"
          >
            Annuler
          </Button>
          <Button 
            type="submit" 
            loading={loading}
            className="flex-1 sm:flex-none py-4 text-lg rounded-xl"
          >
            {loading ? 'Publication...' : 'Publier la question'}
          </Button>
        </div>
      </form>
      </div>

      <CardSearchModal
        isOpen={showCardSearch}
        onClose={() => setShowCardSearch(false)}
        onSelectCard={addCard}
      />
    </Modal>
  )
}