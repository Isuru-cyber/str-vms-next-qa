import * as XLSX from "xlsx";

export interface DatatexInvoiceGroup {
  invoice_no: string;
  gate_pass_no?: string;
  vehicle_no: string;
  total_kg: number;
  total_boxes: number;
  total_cbm: number;
  customer_name: string;
  delivery_address: string;
  dispatched_date: string;
  row_count: number;
}

export interface DatatexGatePassGroup {
  gate_pass_no: string;
  vehicle_no: string;
  total_kg: number;
  total_boxes: number;
  total_cbm: number;
  invoices: string[];
  customer_name: string;
  delivery_address: string;
  dispatched_date: string;
  row_count: number;
}

export interface ParseResult {
  success: boolean;
  invoices: Record<string, DatatexInvoiceGroup>;
  gate_passes: Record<string, DatatexGatePassGroup>;
  total_rows: number;
  errors: string[];
  headers?: Record<string, number>;
}

export class DatatexParser {
  public static parseBuffer(buffer: Buffer): ParseResult {
    try {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return {
          success: false,
          invoices: {},
          gate_passes: {},
          total_rows: 0,
          errors: ["No sheet found in workbook."],
        };
      }

      const worksheet = workbook.Sheets[sheetName];
      const rawGrid: string[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        raw: false,
      });

      if (!rawGrid || rawGrid.length === 0) {
        return {
          success: false,
          invoices: {},
          gate_passes: {},
          total_rows: 0,
          errors: ["The uploaded sheet is empty."],
        };
      }

      const MAX_ROWS = 5000;
      if (rawGrid.length > MAX_ROWS) {
        return {
          success: false,
          invoices: {},
          gate_passes: {},
          total_rows: rawGrid.length,
          errors: [
            `Spreadsheet contains too many rows (${rawGrid.length}). The maximum allowed limit is ${MAX_ROWS} rows.`,
          ],
        };
      }

      return this.processGrid(rawGrid);
    } catch (e: any) {
      return {
        success: false,
        invoices: {},
        gate_passes: {},
        total_rows: 0,
        errors: [`Failed to parse spreadsheet: ${e?.message || e}`],
      };
    }
  }

  private static processGrid(grid: string[][]): ParseResult {
    const requiredPatterns: Record<string, string[]> = {
      invoice: ["invoice no", "invoice number", "inv no", "inv_no", "invoice", "delivery note", "commercial invoice", "inv"],
      gate_pass: ["main gate entry no", "gate entry no", "gate pass", "gatepass", "gate pass no", "gp no"],
      vehicle: ["vehicle number", "vehicle no", "lorry no", "vehicle", "truck no"],
      customer: ["customer", "customer name", "buyer", "consignee"],
      weight: ["dispatch qty (kg)", "dispatch kg", "qty (kg)", "weight (kg)", "actual kg", "net weight", "kg", "dispatch qty"],
      boxes: ["total container count", "container count", "cartons", "boxes", "box count", "ctns", "no of boxes"],
      cbm: ["max. cbm", "cbm", "volume", "volume (cbm)"],
      date: ["dispatched date", "dispatch date", "date"],
      address: ["delivery address", "address", "destination"],
    };

    let headerRowIdx = -1;
    let headerMap: Record<string, number> = {};

    for (let r = 0; r < Math.min(grid.length, 25); r++) {
      const row = grid[r] || [];
      const rowLower = row.map((cell) => String(cell || "").toLowerCase().trim());
      const tempMap: Record<string, number> = {};

      for (const [key, patterns] of Object.entries(requiredPatterns)) {
        for (let c = 0; c < Math.min(rowLower.length, 60); c++) {
          const val = rowLower[c];
          if (patterns.some((p) => val.includes(p))) {
            tempMap[key] = c;
            break;
          }
        }
      }

      if (
        (tempMap.invoice !== undefined || tempMap.gate_pass !== undefined) &&
        (tempMap.vehicle !== undefined || tempMap.weight !== undefined || tempMap.boxes !== undefined)
      ) {
        headerRowIdx = r;
        headerMap = tempMap;
        break;
      }
    }

    if (headerRowIdx === -1 || (headerMap.invoice === undefined && headerMap.gate_pass === undefined)) {
      return {
        success: false,
        invoices: {},
        gate_passes: {},
        total_rows: grid.length,
        errors: ["Could not detect required Datatex columns (Invoice No or Gate Pass No, Vehicle Number, Weight/Boxes)."],
      };
    }

    const invoices: Record<string, DatatexInvoiceGroup> = {};
    const gatePasses: Record<string, DatatexGatePassGroup> = {};
    let processedRows = 0;

    for (let r = headerRowIdx + 1; r < grid.length; r++) {
      const row = grid[r];
      if (!row || row.length === 0) continue;

      const rawInvoice = headerMap.invoice !== undefined ? String(row[headerMap.invoice] || "").trim() : "";
      const rawGp = headerMap.gate_pass !== undefined ? String(row[headerMap.gate_pass] || "").trim() : "";

      if (!rawInvoice && !rawGp) continue;

      const invoiceKey = rawInvoice ? rawInvoice.toUpperCase() : `GP_${rawGp}`;
      const gpKey = rawGp || rawInvoice;

      const vehicle = headerMap.vehicle !== undefined ? String(row[headerMap.vehicle] || "").trim() : "";
      const customer = headerMap.customer !== undefined ? String(row[headerMap.customer] || "").trim() : "";
      const address = headerMap.address !== undefined ? String(row[headerMap.address] || "").trim() : "";
      const dateStr = headerMap.date !== undefined ? String(row[headerMap.date] || "").trim() : "";

      const rawKg = headerMap.weight !== undefined ? parseFloat(String(row[headerMap.weight]).replace(/,/g, "")) : 0;
      const rawBoxes = headerMap.boxes !== undefined ? parseInt(String(row[headerMap.boxes]).replace(/,/g, ""), 10) : 0;
      const rawCbm = headerMap.cbm !== undefined ? parseFloat(String(row[headerMap.cbm]).replace(/,/g, "")) : 0;

      const kg = !isNaN(rawKg) ? rawKg : 0;
      const boxes = !isNaN(rawBoxes) ? rawBoxes : 0;
      const cbm = !isNaN(rawCbm) ? rawCbm : 0;

      // 1. Group by Invoice Number (Primary)
      if (!invoices[invoiceKey]) {
        invoices[invoiceKey] = {
          invoice_no: rawInvoice || rawGp,
          gate_pass_no: rawGp || undefined,
          vehicle_no: vehicle,
          total_kg: 0,
          total_boxes: 0,
          total_cbm: 0,
          customer_name: customer,
          delivery_address: address,
          dispatched_date: dateStr,
          row_count: 0,
        };
      }

      const invGroup = invoices[invoiceKey];
      invGroup.total_kg = Number((invGroup.total_kg + kg).toFixed(3));
      invGroup.total_boxes += boxes;
      invGroup.total_cbm = Number((invGroup.total_cbm + cbm).toFixed(4));
      invGroup.row_count++;

      if (!invGroup.vehicle_no && vehicle) invGroup.vehicle_no = vehicle;
      if (!invGroup.customer_name && customer) invGroup.customer_name = customer;
      if (!invGroup.delivery_address && address) invGroup.delivery_address = address;
      if (!invGroup.dispatched_date && dateStr) invGroup.dispatched_date = dateStr;
      if (!invGroup.gate_pass_no && rawGp) invGroup.gate_pass_no = rawGp;

      // 2. Populate gate_passes for backwards compatibility
      if (!gatePasses[gpKey]) {
        gatePasses[gpKey] = {
          gate_pass_no: rawGp || rawInvoice,
          vehicle_no: vehicle,
          total_kg: 0,
          total_boxes: 0,
          total_cbm: 0,
          invoices: [],
          customer_name: customer,
          delivery_address: address,
          dispatched_date: dateStr,
          row_count: 0,
        };
      }

      const gpGroup = gatePasses[gpKey];
      gpGroup.total_kg = Number((gpGroup.total_kg + kg).toFixed(3));
      gpGroup.total_boxes += boxes;
      gpGroup.total_cbm = Number((gpGroup.total_cbm + cbm).toFixed(4));
      gpGroup.row_count++;

      if (rawInvoice && !gpGroup.invoices.includes(rawInvoice)) {
        gpGroup.invoices.push(rawInvoice);
      }
      if (!gpGroup.vehicle_no && vehicle) gpGroup.vehicle_no = vehicle;
      if (!gpGroup.customer_name && customer) gpGroup.customer_name = customer;
      if (!gpGroup.delivery_address && address) gpGroup.delivery_address = address;
      if (!gpGroup.dispatched_date && dateStr) gpGroup.dispatched_date = dateStr;

      processedRows++;
    }

    return {
      success: Object.keys(invoices).length > 0,
      invoices,
      gate_passes: gatePasses,
      total_rows: processedRows,
      errors: [],
      headers: headerMap,
    };
  }
}
