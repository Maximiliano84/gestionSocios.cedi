export function downloadCsv(filename, rows) {
  const escape = (value) => {
    const str = value == null ? "" : String(value);
    return /[";\n,]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const csv = rows.map((row) => row.map(escape).join(";")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
