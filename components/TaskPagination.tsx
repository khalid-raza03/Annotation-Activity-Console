'use client'

import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch } from '@/lib/store'
import { selectPaginationInfo } from '@/lib/store/selectors'
import { setPagination } from '@/lib/store/tasks'

export function TaskPagination() {
  const dispatch = useDispatch<AppDispatch>()
  const pagination = useSelector(selectPaginationInfo)

  return (
    <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
      <div className="text-sm text-gray-600">
        Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
      </div>

      <div className="flex gap-2">
        <button
          onClick={() =>
            dispatch(setPagination({ page: pagination.page - 1, pageSize: pagination.pageSize }))
          }
          disabled={!pagination.hasPreviousPage}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Previous
        </button>

        <button
          onClick={() =>
            dispatch(setPagination({ page: pagination.page + 1, pageSize: pagination.pageSize }))
          }
          disabled={!pagination.hasNextPage}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Next
        </button>
      </div>
    </div>
  )
}
