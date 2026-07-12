// client/src/components/Table.jsx
// Shared component. Contract (matches how Vehicles.jsx and Drivers.jsx call it):
//   columns: [{ key, header, render?(row) }]  — render is optional; defaults to row[key]
//   rows: array of data objects
//   emptyMessage: string shown when rows is empty
export default function Table({ columns = [], rows = [], emptyMessage = 'No data' }) {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-md">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="text-left px-4 py-2 font-medium text-gray-700">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center px-4 py-6 text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id ?? i} className="border-b border-gray-100 last:border-b-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-2">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}