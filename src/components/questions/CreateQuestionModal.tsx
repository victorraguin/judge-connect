import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Globe, Lock } from 'lucide-react'

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

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<QuestionFormData>({
    defaultValues: {
      is_public: false,
    },
  })

  const isPublic = watch('is_public')

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
        })

      if (insertError) throw insertError

      reset()
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Poser une question MTG" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-400 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

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
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Catégorie
          </label>
          <select
            {...register('category', { required: 'La catégorie est requise' })}
            className="block w-full rounded-md bg-gray-800 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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

        <Textarea
          label="Description détaillée"
          rows={6}
          {...register('content', {
            required: 'La description est requise',
            minLength: {
              value: 50,
              message: 'La description doit contenir au moins 50 caractères',
            },
          })}
          error={errors.content?.message}
          helperText="Décrivez votre situation en détail : cartes impliquées, étapes du jeu, contexte..."
          placeholder="Décrivez votre question avec le maximum de détails possible..."
        />

        <Input
          label="URL d'image (optionnel)"
          type="url"
          {...register('image_url')}
          helperText="Ajoutez une image pour illustrer votre question (état de jeu, cartes, etc.)"
          placeholder="https://example.com/image.jpg"
        />

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="is_public"
            {...register('is_public')}
            className="h-4 w-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="is_public" className="flex items-center text-sm text-gray-300">
            {isPublic ? (
              <Globe className="h-4 w-4 mr-2 text-green-400" />
            ) : (
              <Lock className="h-4 w-4 mr-2 text-gray-400" />
            )}
            Rendre cette question publique
          </label>
        </div>
        <p className="text-xs text-gray-500">
          Les questions publiques peuvent être vues par tous les utilisateurs et permettent d'aider la communauté.
        </p>

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={loading}>
            Publier la question
          </Button>
        </div>
      </form>
    </Modal>
  )
}