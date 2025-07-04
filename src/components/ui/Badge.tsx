import React from 'react'
import { clsx } from 'clsx'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'judge-l1' | 'judge-l2' | 'judge-l3'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        {
          'bg-gray-700 text-gray-300': variant === 'default',
          'bg-green-900/50 text-green-400 border border-green-700': variant === 'success',
          'bg-yellow-900/50 text-yellow-400 border border-yellow-700': variant === 'warning',
          'bg-red-900/50 text-red-400 border border-red-700': variant === 'danger',
          'bg-blue-900/50 text-blue-400 border border-blue-700': variant === 'info',
          'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg': variant === 'judge-l1',
          'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg': variant === 'judge-l2',
          'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg': variant === 'judge-l3',
          'px-2 py-0.5 text-xs': size === 'sm',
          'px-2.5 py-0.5 text-sm': size === 'md',
        },
        className
      )}
    >
      {children}
    </span>
  )
}