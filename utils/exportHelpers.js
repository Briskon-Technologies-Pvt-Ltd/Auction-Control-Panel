// utils/exportHelpers.js

import * as XLSX from "xlsx";

/**
 * Export data to CSV
 */
export const exportToCSV = (filename, headers, dataRows) => {
  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers, ...dataRows].map((e) => e.join(",")).join("\n");
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

/**
 * Export data to Excel
 */
export const exportToExcel = (filename, jsonData, sheetName = "Sheet1") => {
  const worksheet = XLSX.utils.json_to_sheet(jsonData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
};
