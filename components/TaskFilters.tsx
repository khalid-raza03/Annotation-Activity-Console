'use client'

import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch } from '@/lib/store'
import {
  selectFilterType,
  selectFilterStatus,
  selectSearchQuery,
  selectAvailableTaskTypes,
  selectSortField,
  selectSortDirection,
} from '@/lib/store/selectors'
import {
  setFilterType,
  setFilterStatus,
  setSearchQuery,
  clearFilters,
  setSortField,
  setSortDirection,
} from '@/lib/store/ui'
import { NormalizedStatus } from '@/lib/types'
import { SortField } from '@/lib/store/ui'

export function TaskFilters() {
  const dispatch = useDispatch<AppDispatch>()
  const filterType = useSelector(selectFilterType)
  const filterStatus = useSelector(selectFilterStatus)
  const searchQuery = useSelector(selectSearchQuery)
  const availableTypes = useSelector(selectAvailableTaskTypes)
  const sortField = useSelector(selectSortField)
  const sortDirection = useSelector(selectSortDirection)

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="font-semibold text-gray-900">Filters &amp; Sort the data</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search
        </label>
        <input
          id="search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => dispatch(setSearchQuery(e.target.value))}
          placeholder="Search task title..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-750 text-gray-800"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Type
        </label>
        <select
          id="filter-type"
          value={filterType || ''}
          onChange={(e) =>
            dispatch(setFilterType(e.target.value ? (e.target.value as SortField extends never ? never : Parameters<typeof setFilterType>[0]) : undefined))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        >
          <option value="">All types</option>
          {availableTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Status Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <select
          id="filter-status"
          value={filterStatus || ''}
          onChange={(e) =>
            dispatch(setFilterStatus(e.target.value ? (e.target.value as Parameters<typeof setFilterStatus>[0]) : undefined))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        >
          <option value="">All statuses</option>
          {Object.values(NormalizedStatus).map((status: NormalizedStatus) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sort by
        </label>
        <select
          id="sort-field"
          value={sortField}
          onChange={(e) => dispatch(setSortField(e.target.value as SortField))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        >
          <option value="updatedAt">Last updated</option>
          <option value="annotationCount">Annotation count</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Direction
        </label>
        <div className="flex gap-2">
          <button
            id="sort-desc"
            onClick={() => dispatch(setSortDirection('desc'))}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              sortDirection === 'desc'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            ↓ Desc
          </button>
          <button
            id="sort-asc"
            onClick={() => dispatch(setSortDirection('asc'))}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              sortDirection === 'asc'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            ↑ Asc
          </button>
        </div>
      </div>

      <button
        id="clear-filters"
        onClick={() => dispatch(clearFilters())}
        className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Clear Filters
      </button>
    </div>
  )
}
