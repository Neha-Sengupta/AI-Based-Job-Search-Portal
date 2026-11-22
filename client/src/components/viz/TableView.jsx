// The accessible twin of every chart: the same numbers as a table (dataviz: "a table view exists").
export function TableView({ caption, columns, rows }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
        View as table
      </summary>
      <table className="mt-2 w-full text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b">
            {columns.map((column) => (
              <th key={column} scope="col" className="py-1 pr-4 font-medium text-muted-foreground">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-b last:border-0">
              {row.map((cell, index) => (
                <td
                  key={`${row[0]}-${index}`}
                  className={index ? "py-1 pr-4 tabular-nums" : "py-1 pr-4"}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
