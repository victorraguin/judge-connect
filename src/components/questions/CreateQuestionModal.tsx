import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Globe, Lock, Camera, Image as ImageIcon, X, AlertCircle, Search, Plus } from 'lucide-react'
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Poser une question MTG" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-400 px-4 py-3 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Titre de la question"
            {...register('title', {
              required: 'Le titre est requis',
              maxLength: {
                value: 200,
                message: 'Le titre ne peut pas dépasser 200 caractères',
              },
            })}
            error={errors.title?.message}
            placeholder="Ex: Interaction entre Counterspell et Split Second"
            className="text-base"
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Catégorie <span className="text-red-400">*</span>
            </label>
            <select
              {...register('category', { required: 'La catégorie est requise' })}
              className="block w-full rounded-lg bg-gray-800 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base min-h-[44px] px-4 py-3 transition-colors"
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

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description détaillée <span className="text-red-400">*</span>
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
              className="block w-full rounded-lg bg-gray-800 border-gray-600 text-white placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base transition-colors min-h-[120px] px-4 py-3 resize-none"
              placeholder="Décrivez votre question avec le maximum de détails possible...

Exemple :
- Cartes impliquées : Counterspell, Lightning Bolt
- Étape du jeu : Main phase 1
- Contexte : Mon adversaire lance Lightning Bolt sur ma créature..."
            />
            <div className="flex justify-between items-center mt-1">
              {errors.content && (
                <p className="text-sm text-red-400">{errors.content.message}</p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {contentValue?.length || 0} caractères
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              💡 Plus vous donnez de détails, plus la réponse sera précise et rapide
            </p>
          </div>

          {/* Selected Cards */}
          {selectedCards.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cartes sélectionnées ({selectedCards.length})
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedCards.map((card) => (
                  <div key={card.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-600">
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
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
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
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCardSearch(true)}
              className="w-full"
            >
              <Search className="h-4 w-4 mr-2" />
              Ajouter des cartes MTG
            </Button>
            <p className="text-xs text-gray-500 mt-1">
              🃏 Ajoutez les cartes impliquées dans votre question pour plus de clarté
            </p>
          </div>

          {/* Image Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Image (optionnel)
            </label>
            
            {!imagePreview ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="cursor-pointer group">
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-all duration-200 group-hover:bg-gray-800/30">
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
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-all duration-200 group-hover:bg-gray-800/30">
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
                  className="w-full h-48 object-cover rounded-lg border border-gray-600"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-2 bg-red-500/90 text-white rounded-full hover:bg-red-600 transition-colors backdrop-blur-sm"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                  Image ajoutée
                </div>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-2">
              📸 Ajoutez une image pour illustrer votre question (état de jeu, cartes spécifiques, etc.)
            </p>
          </div>

          {/* Visibility Toggle */}
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="is_public"
                {...register('is_public')}
                className="h-4 w-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 mt-1"
              />
              <div className="flex-1">
                <label htmlFor="is_public" className="flex items-center text-sm font-medium text-gray-300 cursor-pointer">
                  {isPublic ? (
                    <Globe className="h-4 w-4 mr-2 text-green-400" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2 text-gray-400" />
                  )}
                  Rendre cette question publique
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {isPublic 
                    ? "✅ Votre question sera visible par tous et pourra aider la communauté"
                    : "🔒 Seuls vous et le juge assigné pourrez voir cette question"
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            className="flex-1 sm:flex-none"
          >
            Annuler
          </Button>
          <Button 
            type="submit" 
            loading={loading}
            className="flex-1 sm:flex-none"
          >
            {loading ? 'Publication...' : 'Publier la question'}
          </Button>
        </div>
      </form>

      <CardSearchModal
        isOpen={showCardSearch}
        onClose={() => setShowCardSearch(false)}
        onSelectCard={addCard}
      />
    </Modal>
  )
}