import { useCallback, useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ColumnDef } from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
import { FolderTree, PencilLine } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { DataTable } from '../../components/shared/data-table'
import { EmptyState } from '../../components/shared/empty-state'
import { PageHeader } from '../../components/shared/page-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import {
  createCategory,
  fetchAdminCategories,
  updateCategory,
} from '../../features/catalog/admin-catalog-service'
import { useAuthStore } from '../../stores/auth-store'
import type { Category } from '../../types/domain'
import { formatDate } from '../../lib/utils'

const categorySchema = z.object({
  name: z.string().min(2, 'Category name is required.'),
  slug: z.string().optional(),
  description: z.string().optional(),
})

type CategoryValues = z.infer<typeof categorySchema>

const columns: ColumnDef<Category>[] = [
  {
    header: 'Category',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-slate-950">{row.original.name}</p>
        <p className="text-xs text-slate-500">{row.original.slug}</p>
      </div>
    ),
  },
  {
    header: 'Description',
    cell: ({ row }) => row.original.description || 'No description',
  },
  {
    header: 'Status',
    cell: ({ row }) => (row.original.is_active ? 'Active' : 'Hidden'),
  },
  {
    header: 'Updated',
    cell: ({ row }) =>
      row.original.updated_at ? formatDate(row.original.updated_at) : 'N/A',
  },
]

export function CategoriesPage() {
  const profile = useAuthStore((state) => state.profile)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
    },
  })

  const loadCategories = useCallback(async () => {
    if (!profile?.store_id) {
      setCategories([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const data = await fetchAdminCategories(profile.store_id)
      setCategories(data)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to load categories.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [profile?.store_id])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  function startEditing(category: Category) {
    setSelectedCategory(category)
    form.reset({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
    })
  }

  function resetForm() {
    setSelectedCategory(null)
    form.reset({
      name: '',
      slug: '',
      description: '',
    })
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (!profile?.store_id) {
      toast.error('This admin account is not attached to a store.')
      return
    }

    setIsSubmitting(true)

    try {
      if (selectedCategory) {
        await updateCategory(selectedCategory.id, {
          storeId: profile.store_id,
          name: values.name,
          slug: values.slug,
          description: values.description,
          isActive: true,
        })
        toast.success('Category updated successfully.')
      } else {
        await createCategory({
          storeId: profile.store_id,
          name: values.name,
          slug: values.slug,
          description: values.description,
          isActive: true,
        })
        toast.success('Category created successfully.')
      }

      resetForm()
      await loadCategories()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to save category.',
      )
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Categories"
        title="Organize the storefront with real category management."
        description="The store owner/admin can create and maintain product categories for the assigned store. These categories feed both the storefront and product assignment workflow."
      />

      {!profile?.store_id ? (
        <EmptyState
          title="No store is assigned to this admin"
          description="Attach this admin account to a store before managing categories."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <Card className="space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <FolderTree className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  {selectedCategory ? 'Edit category' : 'Create category'}
                </h2>
                <p className="mt-1 text-sm leading-7 text-slate-600">
                  Keep category structure clean so the storefront stays easy to browse.
                </p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Name
                </label>
                <Input {...form.register('name')} />
                <p className="mt-1 text-xs text-rose-600">
                  {form.formState.errors.name?.message}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Slug
                </label>
                <Input
                  {...form.register('slug')}
                  placeholder="optional-slug-generated-if-empty"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <Textarea {...form.register('description')} />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? selectedCategory
                      ? 'Saving...'
                      : 'Creating...'
                    : selectedCategory
                      ? 'Save changes'
                      : 'Create category'}
                </Button>
                {selectedCategory ? (
                  <Button type="button" variant="secondary" onClick={resetForm}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          </Card>

          <Card className="space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <PencilLine className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Current categories
                </h2>
                <p className="mt-1 text-sm leading-7 text-slate-600">
                  Select a category to edit its name, slug, or storefront description.
                </p>
              </div>
            </div>

            {isLoading ? (
              <Card className="border-dashed text-sm text-slate-600">
                Loading categories...
              </Card>
            ) : categories.length === 0 ? (
              <EmptyState
                title="No categories yet"
                description="Create the first category so products can be grouped in the storefront."
              />
            ) : (
              <div className="space-y-4">
                <DataTable
                  columns={columns}
                  data={categories}
                  emptyTitle="No categories yet"
                  emptyDescription="Create the first category to get started."
                />
                <div className="grid gap-3 md:grid-cols-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => startEditing(category)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm transition hover:border-slate-400"
                    >
                      <p className="font-medium text-slate-950">{category.name}</p>
                      <p className="mt-1 text-slate-500">{category.slug}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
