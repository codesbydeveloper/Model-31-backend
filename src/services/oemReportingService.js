const AppError = require("../utils/AppError");

const ALL_ROWS = [];

const BRANDS_FILTER = ["All Brands"];

function getOverview(query = {}) {
  const brandFilter = String(query.brand || "All Brands").trim() || "All Brands";

  if (!BRANDS_FILTER.map((b) => b.toLowerCase()).includes(brandFilter.toLowerCase())) {
    throw new AppError(
      `Brand must be one of: ${BRANDS_FILTER.join(", ")}`,
      400
    );
  }

  const rows =
    brandFilter.toLowerCase() === "all brands"
      ? ALL_ROWS
      : ALL_ROWS.filter(
          (r) => r.brand.toLowerCase() === brandFilter.toLowerCase()
        );

  return {
    pageTitle: "OEM Reporting",
    description:
      "Brand-level visibility for compliance and enterprise alignment.",
    readOnly: true,
    reportingMonth: "AUGUST 2024",
    brandsFilter: BRANDS_FILTER,
    selectedBrand: brandFilter,
    complianceNote:
      "Model 31 operates fully within OEM guidelines. All routing, consent, and reporting follow brand standards and franchise rules.",
    tableTitle: "OEM Compliance Alignment",
    rows,
    footer: "OEM reporting data. View and export only.",
    export: {
      csv: "/api/super-admin/oem-reporting/export?format=csv",
      json: "/api/super-admin/oem-reporting/export?format=json",
    },
  };
}

function exportReport(query = {}) {
  const data = getOverview(query);
  const format = String(query.format || "json").toLowerCase();
  const brandSuffix =
    data.selectedBrand === "All Brands"
      ? "all-brands"
      : data.selectedBrand.toLowerCase();

  if (format === "csv") {
    const header =
      "Brand,Stores,Opt-Ins,Sales Influenced,Attribution,Compliance";
    const lines = data.rows.map(
      (r) =>
        `${r.brand},"${r.stores.join("; ")}",${r.optIns},${r.salesInfluenced},${r.attribution}%,${r.compliance}`
    );
    return {
      format: "csv",
      filename: `oem-reporting-august-2024-${brandSuffix}.csv`,
      content: [header, ...lines].join("\n"),
      contentType: "text/csv",
    };
  }

  if (format !== "json") {
    throw new AppError("format must be csv or json", 400);
  }

  return {
    format: "json",
    filename: `oem-reporting-august-2024-${brandSuffix}.json`,
    content: data,
    contentType: "application/json",
  };
}

module.exports = {
  getOverview,
  exportReport,
};
