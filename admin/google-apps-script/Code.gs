/**
 * ==============================================================================
 *  WAGROW CRM - GOOGLE APPS SCRIPT BACKEND
 *  v2.0 — Admin + Reseller System + Earnings Tracking
 * ==============================================================================
 * SETUP:
 *  1. Create Google Sheet named "WAGrow Licensing DB"
 *  2. Extensions → Apps Script → paste this code
 *  3. Run initDatabase() once to create all sheets
 *  4. Deploy → New deployment → Web app → Anyone → Deploy
 *  5. Copy Web App URL and paste into Admin Panel settings
 * ==============================================================================
 */

var DEFAULT_ADMIN_PIN = "123456";
var APP_NAME = "WAGrow WhatsApp CRM";

// ─── MAIN HANDLERS ─────────────────────────────────────────────────────────

function doGet(e) {
  try {
    var p = e ? e.parameter : {};
    var action = p.action || "ping";

    if (action === "ping") {
      return ok({ message: APP_NAME + " API Online 🚀", timestamp: new Date().toISOString() });
    }
    if (action === "init") { initDatabase(); return ok({ message: "DB Initialized" }); }

    // Public desktop-app endpoints (no PIN needed)
    if (action === "validateLicense") return handleValidateLicense(p.key, p.machine_id);
    if (action === "checkStatus")     return handleValidateLicense(p.key, null);

    // Admin-only endpoints
    var pin  = p.pin;
    var role = p.role || "admin";

    // Reseller login check
    if (role === "reseller") {
      var reseller = getResellerByPin(p.reseller_id, pin);
      if (!reseller) return fail("Invalid Reseller ID or PIN");
      if (action === "getResellerStats")    return handleGetResellerStats(reseller.id);
      if (action === "listMyLicenses")      return handleListMyLicenses(reseller.id, p.search, p.status);
      return fail("Unknown reseller action");
    }

    if (!verifyAdminPin(pin)) return fail("Unauthorized: Invalid Admin PIN");

    if (action === "getStats")        return handleGetStats();
    if (action === "listLicenses")    return handleListLicenses(p.search, p.status, p.reseller_id);
    if (action === "getActivations")  return handleGetActivations(p.key);
    if (action === "listResellers")   return handleListResellers();
    if (action === "getEarnings")     return handleGetEarnings(p.period, p.reseller_id);
    if (action === "listTransactions")return handleListTransactions(p.reseller_id, p.period);
    if (action === "listTrials")      return handleListTrials(p.period, p.status);

    return fail("Unknown action: " + action);
  } catch (err) {
    return fail(err.toString());
  }
}

function doPost(e) {
  try {
    var d = {};
    if (e && e.postData && e.postData.contents) {
      try { d = JSON.parse(e.postData.contents); } catch(ex) { d = e.parameter || {}; }
    } else if (e && e.parameter) { d = e.parameter; }

    var action = d.action || (e && e.parameter ? e.parameter.action : "");
    var role   = d.role || "admin";

    // ── Public endpoints ──
    if (action === "validateLicense") return handleValidateLicense(d.key || d.licenseKey || d.license_code, d.machine_id || d.machineId);
    if (action === "activateLicense") return handleValidateLicense(d.key || d.licenseKey, d.machine_id || d.machineId);
    if (action === "requestTrial")    return handleRequestTrial(d);  // 🆕 Public trial

    // ── Reseller login ──
    if (action === "resellerLogin") {
      var res = getResellerByPin(d.reseller_id, d.pin);
      if (res) return ok({ message: "Login successful", reseller: { id: res.id, name: res.name, mobile: res.mobile, commission_percent: res.commission_percent, balance: res.balance, status: res.status } });
      return fail("Invalid Reseller ID or PIN");
    }

    // ── Admin login ──
    if (action === "login") {
      if (verifyAdminPin(d.pin)) return ok({ message: "Admin Login successful", role: "admin" });
      return fail("Invalid Admin PIN");
    }

    // ── Reseller-authenticated actions ──
    if (role === "reseller") {
      var reseller = getResellerByPin(d.reseller_id, d.pin);
      if (!reseller) return fail("Unauthorized Reseller");
      if (reseller.status !== "active") return fail("Your reseller account is suspended. Contact admin.");
      if (action === "createLicense")     return handleCreateLicense(d, reseller);
      if (action === "getResellerStats")  return handleGetResellerStats(reseller.id);
      if (action === "listMyLicenses")    return handleListMyLicenses(reseller.id, d.search, d.status);
      return fail("Unknown reseller action");
    }

    // ── Admin-authenticated actions ──
    if (!verifyAdminPin(d.pin)) return fail("Unauthorized: Invalid Admin PIN");

    if (action === "createLicense")    return handleCreateLicense(d, null);
    if (action === "updateLicense")    return handleUpdateLicense(d);
    if (action === "deleteLicense")    return handleDeleteLicense(d.id || d.key);
    if (action === "resetDevices")     return handleResetDevices(d.key);
    if (action === "updatePin")        return handleUpdateAdminPin(d.new_pin);
    if (action === "getStats")         return handleGetStats();
    if (action === "listLicenses")     return handleListLicenses(d.search, d.status, d.reseller_id);
    if (action === "getEarnings")      return handleGetEarnings(d.period, d.reseller_id);
    if (action === "listTransactions") return handleListTransactions(d.reseller_id, d.period);
    if (action === "listResellers")    return handleListResellers();
    if (action === "createReseller")   return handleCreateReseller(d);
    if (action === "updateReseller")   return handleUpdateReseller(d);
    if (action === "deleteReseller")   return handleDeleteReseller(d.id);
    if (action === "settleCommission") return handleSettleCommission(d.reseller_id, d.amount, d.note);
    if (action === "listTrials")       return handleListTrials(d.period, d.status);
    if (action === "updateTrialStatus") return handleUpdateTrialStatus(d.id, d.status, d.note);

    return fail("Unknown action");
  } catch (err) {
    return fail(err.toString());
  }
}

// ─── DATABASE INIT ──────────────────────────────────────────────────────────

function initDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.rename(APP_NAME + " Licensing DB");

  createSheetIfMissing(ss, "Licenses", [
    "id","license_key","customer_name","mobile","email","plan_type",
    "validity_days","price","created_at","expires_at","status",
    "max_devices","active_devices","reseller_id","reseller_name","notes"
  ]);
  createSheetIfMissing(ss, "Activations", [
    "id","license_key","machine_id","customer_name","activated_at","last_heartbeat","app_version","status"
  ]);
  createSheetIfMissing(ss, "Resellers", [
    "id","name","mobile","email","pin","commission_percent",
    "balance","total_sales","total_earned","status","created_at","notes"
  ]);
  createSheetIfMissing(ss, "Transactions", [
    "id","date","reseller_id","reseller_name","license_key","customer_name",
    "plan_type","sale_price","commission_percent","commission_amount","status","notes"
  ]);
  createSheetIfMissing(ss, "Settings", ["key","value","updated_at"]);

  // Default settings
  var set = ss.getSheetByName("Settings");
  if (set.getLastRow() <= 1) {
    set.appendRow(["admin_pin",   DEFAULT_ADMIN_PIN,   new Date().toISOString()]);
    set.appendRow(["app_name",    APP_NAME,            new Date().toISOString()]);
    set.appendRow(["currency",    "₹",                 new Date().toISOString()]);
    set.appendRow(["pro_price",   "2999",              new Date().toISOString()]);
    set.appendRow(["def_commission","30",              new Date().toISOString()]);
    set.appendRow(["trial_days",  "2",                 new Date().toISOString()]);
    set.appendRow(["trial_enabled","true",            new Date().toISOString()]);
  }

  // Trial Requests sheet
  createSheetIfMissing(ss, "TrialRequests", [
    "id", "name", "mobile", "machine_id", "license_key",
    "requested_at", "expires_at", "status", "notes"
  ]);

  Logger.log("✅ " + APP_NAME + " Database Initialized!");
}

function createSheetIfMissing(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#0f172a")
      .setFontColor("#f8fafc");
  }
  return sh;
}

// ─── AUTH ───────────────────────────────────────────────────────────────────

function verifyAdminPin(pin) {
  if (!pin) return false;
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var set = ss.getSheetByName("Settings");
  if (!set) return String(pin) === DEFAULT_ADMIN_PIN;
  var data = set.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === "admin_pin") return String(data[i][1]).trim() === String(pin).trim();
  }
  return String(pin).trim() === DEFAULT_ADMIN_PIN;
}

function getResellerByPin(resellerId, pin) {
  if (!resellerId || !pin) return null;
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var sh   = ss.getSheetByName("Resellers");
  if (!sh || sh.getLastRow() <= 1) return null;
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(resellerId) &&
        String(data[i][4]).trim() === String(pin).trim()) {
      return rowToReseller(data[i]);
    }
  }
  return null;
}

function rowToReseller(r) {
  return {
    id: r[0], name: r[1], mobile: r[2], email: r[3], pin: r[4],
    commission_percent: parseFloat(r[5]) || 30,
    balance: parseFloat(r[6]) || 0,
    total_sales: parseFloat(r[7]) || 0,
    total_earned: parseFloat(r[8]) || 0,
    status: r[9] || "active",
    created_at: r[10], notes: r[11]
  };
}

// ─── STATS ──────────────────────────────────────────────────────────────────

function handleGetStats() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var lic  = ss.getSheetByName("Licenses");
  var act  = ss.getSheetByName("Activations");
  var res  = ss.getSheetByName("Resellers");
  var trx  = ss.getSheetByName("Transactions");

  var now  = Date.now();
  var total = 0, active = 0, expired = 0, suspended = 0;
  var totalRevenue = 0, monthRevenue = 0;

  if (lic && lic.getLastRow() > 1) {
    var rows = lic.getRange(2, 1, lic.getLastRow() - 1, 16).getValues();
    total = rows.length;
    rows.forEach(function(r) {
      var price = parseFloat(r[7]) || 0;
      totalRevenue += price;
      var st = r[10]; var exp = new Date(r[9]).getTime();
      if (st === "suspended" || st === "revoked") suspended++;
      else if (now > exp) expired++;
      else active++;
    });
  }

  // This month's revenue
  if (trx && trx.getLastRow() > 1) {
    var tData = trx.getDataRange().getValues();
    var thisMonth = new Date().toISOString().substring(0, 7); // "2026-09"
    for (var i = 1; i < tData.length; i++) {
      var txDate = String(tData[i][0]).substring(0, 7);
      if (txDate === thisMonth) monthRevenue += parseFloat(tData[i][7]) || 0;
    }
  }

  var totalActs   = act && act.getLastRow() > 1 ? act.getLastRow() - 1 : 0;
  var totalRes    = res && res.getLastRow() > 1 ? res.getLastRow() - 1 : 0;
  var pendingComm = 0;
  if (res && res.getLastRow() > 1) {
    var rData = res.getDataRange().getValues();
    for (var j = 1; j < rData.length; j++) pendingComm += parseFloat(rData[j][6]) || 0;
  }

  var currency = getSetting("currency") || "₹";

  return ok({
    stats: {
      total, active, expired, suspended,
      total_activations: totalActs,
      total_resellers: totalRes,
      total_revenue: totalRevenue,
      month_revenue: monthRevenue,
      pending_commission: pendingComm,
      currency: currency
    }
  });
}

function handleGetResellerStats(resellerId) {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var lic = ss.getSheetByName("Licenses");
  var trx = ss.getSheetByName("Transactions");

  var now = Date.now();
  var total = 0, active = 0, expired = 0;
  var totalSales = 0, monthSales = 0, totalComm = 0;

  if (lic && lic.getLastRow() > 1) {
    var rows = lic.getRange(2, 1, lic.getLastRow() - 1, 16).getValues();
    rows.forEach(function(r) {
      if (String(r[13]) !== String(resellerId)) return;
      total++;
      var price = parseFloat(r[7]) || 0;
      totalSales += price;
      var st = r[10]; var exp = new Date(r[9]).getTime();
      if (st === "active" && now < exp) active++;
      else expired++;
    });
  }

  if (trx && trx.getLastRow() > 1) {
    var tData = trx.getDataRange().getValues();
    var thisMonth = new Date().toISOString().substring(0, 7);
    for (var i = 1; i < tData.length; i++) {
      if (String(tData[i][2]) !== String(resellerId)) continue;
      var txDate = String(tData[i][0]).substring(0, 7);
      if (txDate === thisMonth) monthSales += parseFloat(tData[i][7]) || 0;
      totalComm += parseFloat(tData[i][9]) || 0;
    }
  }

  // Get pending balance
  var resSh  = ss.getSheetByName("Resellers");
  var balance = 0;
  if (resSh && resSh.getLastRow() > 1) {
    var rData = resSh.getDataRange().getValues();
    for (var j = 1; j < rData.length; j++) {
      if (String(rData[j][0]) === String(resellerId)) {
        balance = parseFloat(rData[j][6]) || 0;
        break;
      }
    }
  }

  return ok({
    stats: {
      total, active, expired,
      total_sales: totalSales,
      month_sales: monthSales,
      total_commission: totalComm,
      pending_balance: balance,
      currency: getSetting("currency") || "₹"
    }
  });
}

// ─── LICENSES ───────────────────────────────────────────────────────────────

function handleListLicenses(search, statusFilter, resellerFilter) {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var sh  = ss.getSheetByName("Licenses");
  if (!sh || sh.getLastRow() <= 1) return ok({ licenses: [] });

  var data = sh.getRange(2, 1, sh.getLastRow() - 1, 16).getValues();
  var list = [];
  var now  = Date.now();
  var q    = (search || "").toLowerCase().trim();

  data.forEach(function(r) {
    var st = r[10], exp = new Date(r[9]).getTime();
    if (st === "active" && now > exp) st = "expired";

    if (statusFilter && statusFilter !== "all" && st !== statusFilter) return;
    if (resellerFilter && resellerFilter !== "all" && String(r[13]) !== String(resellerFilter)) return;
    if (q) {
      var match = (r[2]||"").toLowerCase().includes(q) ||
                  (r[1]||"").toLowerCase().includes(q) ||
                  (r[3]||"").toString().includes(q)    ||
                  (r[4]||"").toLowerCase().includes(q);
      if (!match) return;
    }
    list.push({
      id: r[0], license_key: r[1], customer_name: r[2],
      mobile: r[3], email: r[4], plan_type: r[5],
      validity_days: r[6], price: r[7],
      created_at: r[8], expires_at: r[9], status: st,
      max_devices: r[11], active_devices: r[12],
      reseller_id: r[13], reseller_name: r[14], notes: r[15]
    });
  });

  list.reverse();
  return ok({ licenses: list });
}

function handleListMyLicenses(resellerId, search, statusFilter) {
  return handleListLicenses(search, statusFilter, String(resellerId));
}

function handleCreateLicense(d, reseller) {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var sh  = ss.getSheetByName("Licenses");
  if (!sh) { initDatabase(); sh = ss.getSheetByName("Licenses"); }

  var id          = Utilities.getUuid();
  var key         = d.license_key || generateKey();
  var name        = d.customer_name || "Client";
  var mobile      = d.mobile || "";
  var email       = d.email  || "";
  var planType    = d.plan_type || "Pro";
  var validDays   = parseInt(d.validity_days) || 365;
  var price       = parseFloat(d.price) || 0;
  var maxDevices  = parseInt(d.max_devices)  || 1;
  var notes       = d.notes || "";
  var resId       = reseller ? reseller.id : (d.reseller_id || "");
  var resName     = reseller ? reseller.name : (d.reseller_name || "Admin");

  var now      = new Date();
  var expiresAt = d.expires_at ? new Date(d.expires_at) : new Date(now.getTime() + validDays * 86400000);

  sh.appendRow([id, key, name, mobile, email, planType, validDays, price,
    now.toISOString(), expiresAt.toISOString(), "active",
    maxDevices, 0, resId, resName, notes]);

  // Record transaction if reseller
  if (reseller && price > 0) {
    var commPct  = reseller.commission_percent || 30;
    var commAmt  = Math.round(price * commPct / 100 * 100) / 100;
    recordTransaction(reseller.id, reseller.name, key, name, planType, price, commPct, commAmt);
    updateResellerBalance(reseller.id, price, commAmt);
  }

  return ok({
    message: "License created",
    license: { id, license_key: key, customer_name: name, plan_type: planType, expires_at: expiresAt.toISOString(), price, reseller_name: resName }
  });
}

function handleUpdateLicense(d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("Licenses");
  if (!sh) return fail("Licenses sheet missing");
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(d.id) || rows[i][1] === d.license_key) {
      var r = i + 1;
      if (d.customer_name !== undefined) sh.getRange(r, 3).setValue(d.customer_name);
      if (d.mobile        !== undefined) sh.getRange(r, 4).setValue(d.mobile);
      if (d.email         !== undefined) sh.getRange(r, 5).setValue(d.email);
      if (d.plan_type     !== undefined) sh.getRange(r, 6).setValue(d.plan_type);
      if (d.price         !== undefined) sh.getRange(r, 8).setValue(parseFloat(d.price) || 0);
      if (d.expires_at    !== undefined) sh.getRange(r, 10).setValue(d.expires_at);
      if (d.status        !== undefined) sh.getRange(r, 11).setValue(d.status);
      if (d.max_devices   !== undefined) sh.getRange(r, 12).setValue(parseInt(d.max_devices) || 1);
      if (d.notes         !== undefined) sh.getRange(r, 16).setValue(d.notes);
      return ok({ message: "License updated" });
    }
  }
  return fail("License not found");
}

function handleDeleteLicense(idOrKey) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("Licenses");
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(idOrKey) || rows[i][1] === idOrKey) {
      sh.deleteRow(i + 1);
      return ok({ message: "License deleted" });
    }
  }
  return fail("License not found");
}

function handleResetDevices(key) {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var act = ss.getSheetByName("Activations");
  var lic = ss.getSheetByName("Licenses");
  if (act && act.getLastRow() > 1) {
    var data = act.getDataRange().getValues();
    for (var i = data.length - 1; i >= 1; i--)
      if (data[i][1] === key) act.deleteRow(i + 1);
  }
  if (lic && lic.getLastRow() > 1) {
    var lData = lic.getDataRange().getValues();
    for (var j = 1; j < lData.length; j++) {
      if (lData[j][1] === key) { lic.getRange(j + 1, 13).setValue(0); break; }
    }
  }
  return ok({ message: "Devices reset" });
}

// ─── VALIDATE / ACTIVATE ────────────────────────────────────────────────────

function handleValidateLicense(key, machineId) {
  if (!key) return fail("License key required");
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var lic = ss.getSheetByName("Licenses");
  var act = ss.getSheetByName("Activations");
  if (!lic) return fail("Database not initialized");

  var rows = lic.getDataRange().getValues();
  var row = null, rowIdx = -1;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1] === key.trim()) { row = rows[i]; rowIdx = i + 1; break; }
  }
  if (!row) return ok({ valid: false, error: "License not found", error_code: "LICENSE_NOT_FOUND" });

  var st  = row[10];
  var exp = new Date(row[9]).getTime();
  var now = Date.now();
  if (st === "suspended" || st === "revoked")
    return ok({ valid: false, error: "License " + st + " by administrator.", error_code: "LICENSE_REVOKED" });
  if (now > exp)
    return ok({ valid: false, error: "License expired on " + new Date(exp).toLocaleDateString(), error_code: "LICENSE_EXPIRED" });

  var maxDev   = parseInt(row[11]) || 1;
  var custName = row[2];
  var planType = row[5];

  if (machineId && act) {
    var aData  = act.getDataRange().getValues();
    var bound  = false, boundCnt = 0;
    for (var a = 1; a < aData.length; a++) {
      if (aData[a][1] === key.trim()) {
        boundCnt++;
        if (aData[a][2] === machineId) {
          bound = true;
          act.getRange(a + 1, 6).setValue(new Date().toISOString());
        }
      }
    }
    if (!bound) {
      if (boundCnt >= maxDev) return ok({ valid: false, error: "Device limit reached (" + boundCnt + "/" + maxDev + ")", error_code: "MAX_DEVICES_REACHED" });
      act.appendRow([Utilities.getUuid(), key.trim(), machineId, custName, new Date().toISOString(), new Date().toISOString(), "9.0.0", "active"]);
      boundCnt++;
      lic.getRange(rowIdx, 13).setValue(boundCnt);
    }
  }

  return ok({
    valid: true, success: true,
    data: {
      license_key: key, customer_name: custName,
      plan_name: planType, plan_type: planType,
      expires_at: new Date(exp).toISOString(),
      expires_at_formatted: new Date(exp).toLocaleDateString(),
      days_remaining: Math.ceil((exp - now) / 86400000),
      status: "active", max_devices: maxDev, isValid: true
    }
  });
}

// ─── ACTIVATIONS ─────────────────────────────────────────────────────────────

function handleGetActivations(key) {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var sh  = ss.getSheetByName("Activations");
  if (!sh || sh.getLastRow() <= 1) return ok({ activations: [] });
  var data = sh.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    if (!key || data[i][1] === key) {
      list.push({ id: data[i][0], license_key: data[i][1], machine_id: data[i][2],
        customer_name: data[i][3], activated_at: data[i][4], last_heartbeat: data[i][5],
        app_version: data[i][6], status: data[i][7] });
    }
  }
  return ok({ activations: list });
}

// ─── RESELLERS ───────────────────────────────────────────────────────────────

function handleListResellers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("Resellers");
  if (!sh || sh.getLastRow() <= 1) return ok({ resellers: [] });
  var data = sh.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    list.push({
      id: data[i][0], name: data[i][1], mobile: data[i][2], email: data[i][3],
      // Don't expose PIN
      commission_percent: parseFloat(data[i][5]) || 30,
      balance: parseFloat(data[i][6]) || 0,
      total_sales: parseFloat(data[i][7]) || 0,
      total_earned: parseFloat(data[i][8]) || 0,
      status: data[i][9], created_at: data[i][10], notes: data[i][11]
    });
  }
  list.reverse();
  return ok({ resellers: list });
}

function handleCreateReseller(d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("Resellers");
  if (!sh) { initDatabase(); sh = ss.getSheetByName("Resellers"); }
  var id = Utilities.getUuid().split("-")[0].toUpperCase(); // short readable ID e.g. "A1B2C3D4"
  sh.appendRow([
    id, d.name || "Reseller", d.mobile || "", d.email || "",
    d.pin || "1234", parseFloat(d.commission_percent) || 30,
    0, 0, 0, "active", new Date().toISOString(), d.notes || ""
  ]);
  return ok({ message: "Reseller created", reseller: { id, name: d.name } });
}

function handleUpdateReseller(d) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var sh   = ss.getSheetByName("Resellers");
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(d.id)) {
      var r = i + 1;
      if (d.name               !== undefined) sh.getRange(r, 2).setValue(d.name);
      if (d.mobile             !== undefined) sh.getRange(r, 3).setValue(d.mobile);
      if (d.email              !== undefined) sh.getRange(r, 4).setValue(d.email);
      if (d.pin                !== undefined) sh.getRange(r, 5).setValue(d.pin);
      if (d.commission_percent !== undefined) sh.getRange(r, 6).setValue(parseFloat(d.commission_percent) || 30);
      if (d.status             !== undefined) sh.getRange(r, 10).setValue(d.status);
      if (d.notes              !== undefined) sh.getRange(r, 12).setValue(d.notes);
      return ok({ message: "Reseller updated" });
    }
  }
  return fail("Reseller not found");
}

function handleDeleteReseller(id) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var sh   = ss.getSheetByName("Resellers");
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) { sh.deleteRow(i + 1); return ok({ message: "Reseller deleted" }); }
  }
  return fail("Reseller not found");
}

function handleSettleCommission(resellerId, amount, note) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var sh   = ss.getSheetByName("Resellers");
  var rows = sh.getDataRange().getValues();
  var amt  = parseFloat(amount) || 0;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(resellerId)) {
      var cur = parseFloat(rows[i][6]) || 0;
      sh.getRange(i + 1, 7).setValue(Math.max(0, cur - amt));
      // Log as settlement transaction
      recordTransaction(resellerId, rows[i][1], "", "Commission Settlement", "Payment", 0, 0, -amt, note || "Commission paid");
      return ok({ message: "Commission settled: ₹" + amt });
    }
  }
  return fail("Reseller not found");
}

// ─── EARNINGS ────────────────────────────────────────────────────────────────

function handleGetEarnings(period, resellerFilter) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var trx  = ss.getSheetByName("Transactions");
  if (!trx || trx.getLastRow() <= 1) return ok({ earnings: [], summary: { total: 0, commission: 0, net: 0 } });

  var data = trx.getDataRange().getValues();
  var now  = new Date();
  var filterDate = null;

  if (period === "today") {
    filterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "week") {
    filterDate = new Date(now.getTime() - 7 * 86400000);
  } else if (period === "month") {
    filterDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "year") {
    filterDate = new Date(now.getFullYear(), 0, 1);
  }

  var list = [], totalRevenue = 0, totalCommission = 0;

  for (var i = 1; i < data.length; i++) {
    var row  = data[i];
    var date = new Date(row[0]);
    if (filterDate && date < filterDate) continue;
    if (resellerFilter && resellerFilter !== "all" && String(row[2]) !== String(resellerFilter)) continue;
    var revenue = parseFloat(row[7]) || 0;
    var comm    = parseFloat(row[9]) || 0;
    totalRevenue    += revenue;
    totalCommission += comm;
    list.push({
      id: row[0], date: row[0], reseller_id: row[2], reseller_name: row[3],
      license_key: row[4], customer_name: row[5], plan_type: row[6],
      sale_price: revenue, commission_percent: row[8], commission_amount: comm,
      net: revenue - comm, status: row[10], notes: row[11]
    });
  }

  list.reverse();
  return ok({
    earnings: list,
    summary: {
      total: totalRevenue,
      commission: totalCommission,
      net: totalRevenue - totalCommission,
      count: list.length,
      currency: getSetting("currency") || "₹"
    }
  });
}

function handleListTransactions(resellerId, period) {
  return handleGetEarnings(period, resellerId);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function recordTransaction(resId, resName, key, custName, plan, price, commPct, commAmt, notes) {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var trx = ss.getSheetByName("Transactions");
  if (!trx) { initDatabase(); trx = ss.getSheetByName("Transactions"); }
  trx.appendRow([
    new Date().toISOString(), new Date().toISOString(),
    resId, resName, key, custName, plan,
    price, commPct, commAmt, "completed", notes || ""
  ]);
}

function updateResellerBalance(resellerId, salePrice, commAmt) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var sh   = ss.getSheetByName("Resellers");
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(resellerId)) {
      var r = i + 1;
      sh.getRange(r, 7).setValue((parseFloat(rows[i][6]) || 0) + commAmt); // balance
      sh.getRange(r, 8).setValue((parseFloat(rows[i][7]) || 0) + salePrice); // total_sales
      sh.getRange(r, 9).setValue((parseFloat(rows[i][8]) || 0) + commAmt);  // total_earned
      break;
    }
  }
}

function handleUpdateAdminPin(newPin) {
  if (!newPin || String(newPin).trim().length < 4) return fail("PIN must be at least 4 digits");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("Settings");
  if (!sh) { initDatabase(); sh = ss.getSheetByName("Settings"); }
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === "admin_pin") {
      sh.getRange(i + 1, 2).setValue(String(newPin).trim());
      sh.getRange(i + 1, 3).setValue(new Date().toISOString());
      return ok({ message: "Admin PIN updated" });
    }
  }
  sh.appendRow(["admin_pin", String(newPin).trim(), new Date().toISOString()]);
  return ok({ message: "Admin PIN updated" });
}

function getSetting(key) {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var sh  = ss.getSheetByName("Settings");
  if (!sh) return null;
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) return String(data[i][1]);
  }
  return null;
}

function generateKey() {
  function rh(n) { return ("000" + Math.floor(Math.random() * 65535).toString(16).toUpperCase()).slice(-n > 0 ? n : 4); }
  var p1 = rh(4), p2 = rh(4), p3 = rh(4);
  var md5 = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, p1 + p2 + p3);
  var ck  = md5.map(function(b) { var h = (b < 0 ? b + 256 : b).toString(16); return h.length===1?"0"+h:h; }).join("").toUpperCase().substring(0, 4);
  return "LW-" + p1 + "-" + p2 + "-" + p3 + "-" + ck;
}

// ─── TRIAL SYSTEM ─────────────────────────────────────────────────────────────

function handleRequestTrial(d) {
  var name      = (d.name      || "").trim();
  var mobile    = (d.mobile    || "").replace(/[^0-9+]/g, "");
  var machineId = (d.machine_id || "").trim();

  if (!name || name.length < 2) return fail("Apna naam likhein (kam se kam 2 characters).");
  if (!mobile || mobile.length < 10) return fail("Valid WhatsApp number likhein (10+ digits).");
  if (!machineId) return fail("Machine ID missing. App dobara install karein.");

  var ss  = SpreadsheetApp.getActiveSpreadsheet();

  // --- Ensure TrialRequests sheet exists ---
  var sh = ss.getSheetByName("TrialRequests");
  if (!sh) {
    createSheetIfMissing(ss, "TrialRequests", [
      "id", "name", "mobile", "machine_id", "license_key",
      "requested_at", "expires_at", "status", "notes"
    ]);
    sh = ss.getSheetByName("TrialRequests");
  }

  // --- Check if trial already used: same machine_id OR same mobile ---
  if (sh.getLastRow() > 1) {
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var existingMobile    = String(rows[i][2]).replace(/[^0-9+]/g, "");
      var existingMachineId = String(rows[i][3]);
      if (existingMachineId === machineId) {
        return fail("IS_DEVICE_USED"); // Special code for electron to handle
      }
      if (existingMobile === mobile && existingMobile.length >= 10) {
        return fail("IS_MOBILE_USED"); // Special code for electron to handle
      }
    }
  }

  // --- Check if trial setting is enabled ---
  var trialEnabled = getSetting("trial_enabled") || "true";
  if (trialEnabled !== "true") return fail("Trial abhi available nahi hai. Admin se contact karein.");

  // --- Generate trial license ---
  var trialDays = parseInt(getSetting("trial_days") || "2");
  var key       = generateKey();
  var now       = new Date();
  var expiresAt = new Date(now.getTime() + trialDays * 86400000);
  var id        = Utilities.getUuid();

  // --- Save to TrialRequests ---
  sh.appendRow([
    id, name, mobile, machineId, key,
    now.toISOString(), expiresAt.toISOString(), "active", ""
  ]);

  // --- Also create a license entry for validation to work ---
  var licSh = ss.getSheetByName("Licenses");
  if (!licSh) { initDatabase(); licSh = ss.getSheetByName("Licenses"); }
  licSh.appendRow([
    id, key, name, mobile, "", "Trial",
    trialDays, 0,
    now.toISOString(), expiresAt.toISOString(), "active",
    1, 0, "", "Trial User", "Auto-generated trial"
  ]);

  // --- Activate for this machine in Activations ---
  var actSh = ss.getSheetByName("Activations");
  if (!actSh) { initDatabase(); actSh = ss.getSheetByName("Activations"); }
  actSh.appendRow([
    Utilities.getUuid(), key, machineId, name,
    now.toISOString(), now.toISOString(), "9.0.0", "active"
  ]);
  licSh.getRange(licSh.getLastRow(), 13).setValue(1); // active_devices = 1

  return ok({
    message: "Trial activated! " + trialDays + " din ke liye valid hai.",
    license_key: key,
    customer_name: name,
    mobile: mobile,
    plan_type: "Trial",
    trial_days: trialDays,
    expires_at: expiresAt.toISOString(),
    expires_at_formatted: Utilities.formatDate(expiresAt, Session.getScriptTimeZone(), "dd MMM yyyy"),
    machine_id: machineId
  });
}

function handleListTrials(period, statusFilter) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("TrialRequests");
  if (!sh || sh.getLastRow() <= 1) return ok({ trials: [], total: 0 });

  var data = sh.getDataRange().getValues();
  var now  = Date.now();
  var list = [];
  var filterDate = null;

  if (period === "today") filterDate = new Date(new Date().setHours(0,0,0,0));
  else if (period === "week") filterDate = new Date(now - 7 * 86400000);
  else if (period === "month") filterDate = new Date(new Date().setDate(1));

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var reqDate = new Date(row[5]);
    if (filterDate && reqDate < filterDate) continue;

    var st = row[7];
    var exp = new Date(row[6]).getTime();
    if (st === "active" && now > exp) st = "expired";

    if (statusFilter && statusFilter !== "all" && st !== statusFilter) continue;

    list.push({
      id: row[0], name: row[1], mobile: row[2],
      machine_id: row[3], license_key: row[4],
      requested_at: row[5], expires_at: row[6],
      status: st, notes: row[8],
      days_left: Math.max(0, Math.ceil((exp - now) / 86400000))
    });
  }
  list.reverse();
  return ok({ trials: list, total: list.length });
}

function handleUpdateTrialStatus(id, status, note) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("TrialRequests");
  if (!sh || sh.getLastRow() <= 1) return fail("TrialRequests sheet missing");
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sh.getRange(i + 1, 8).setValue(status);
      if (note) sh.getRange(i + 1, 9).setValue(note);
      return ok({ message: "Trial status updated" });
    }
  }
  return fail("Trial not found");
}

function ok(obj) {
  var res = { success: true };
  if (obj) {
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) res[k] = obj[k];
    }
  }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}
function fail(msg) {
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: msg })).setMimeType(ContentService.MimeType.JSON);
}

