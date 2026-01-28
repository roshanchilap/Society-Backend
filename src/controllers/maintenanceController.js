const { Parser } = require("json2csv");
const puppeteer = require("puppeteer");
const generateSlipNumber = require("../services/generateSlipNumber");

/* ----------------------------------
   Helper: get flat users
---------------------------------- */
async function getFlatUsers(req, flatId) {
  const flat = await req.models.Flat.findById(flatId)
    .select("ownerId tenantId")
    .lean();

  const users = [];
  if (flat?.ownerId) users.push(flat.ownerId);
  if (flat?.tenantId) users.push(flat.tenantId);

  return users;
}

// ✅ Create Maintenance Record (Admin only)
exports.createMaintenance = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "You do not have permission to create maintenance records.",
      });
    }

    const { flatId, amount, dueDate, notes, status } = req.body;

    if (!flatId || !amount || !dueDate) {
      return res.status(400).json({
        message: "Flat, amount, and due date are required.",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than zero.",
      });
    }

    const parsedDate = new Date(dueDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        message: "Please provide a valid due date.",
      });
    }

    const cycleYear = parsedDate.getFullYear();
    const cycleMonth = parsedDate.getMonth() + 1;

    const maintenance = new req.models.Maintenance({
      flatId,
      amount,
      dueDate: parsedDate,
      cycleYear,
      cycleMonth,
      notes,
      status: status || "pending",
    });

    /* ---------- PAID at creation ---------- */
    if (status === "paid") {
      const slipNumber = await generateSlipNumber(req);
      maintenance.slipNumber = slipNumber;
      maintenance.receiptGenerated = true;

      const flat = await req.models.Flat.findById(flatId).populate("ownerId");

      const ownerId = flat?.ownerId?._id;
      if (!ownerId) {
        return res.status(404).json({ message: "Flat owner not found." });
      }

      const numberToWords = require("number-to-words");
      const amountWords =
        numberToWords.toWords(amount).replace(/^\w/, (c) => c.toUpperCase()) +
        " only";

      await req.models.SlipRegistry.create({
        societyId: req.user.societyId,
        flatId,
        ownerId,
        maintenanceId: maintenance._id,
        slipNumber,
        month: cycleMonth,
        year: cycleYear,
        amount,
        amountWords,
      });
    }

    await maintenance.save();

    /* ---------- Notifications ---------- */
    const usersToNotify = await getFlatUsers(req, flatId);

    if (usersToNotify.length) {
      await req.models.Notification.insertMany(
        usersToNotify.map((userId) => ({
          userId,
          type: "maintenance",
          title:
            status === "paid"
              ? "Maintenance marked as paid"
              : "New maintenance generated",
          message:
            status === "paid"
              ? `Payment received. Receipt #${maintenance.slipNumber}`
              : `Maintenance of ₹${amount} has been generated.`,
          meta: { maintenanceId: maintenance._id },
        })),
      );
    }

    await req.models.AuditLog.create({
      action: "create",
      collection: "Maintenance",
      recordId: maintenance._id,
      userId: req.user.id,
      details: { amount, dueDate, cycleYear, cycleMonth, status },
    });

    res.status(201).json({
      message: "Maintenance record created successfully.",
      id: maintenance._id,
      slipNumber: maintenance.slipNumber || null,
    });
  } catch (err) {
    console.error("Create maintenance error:", err);
    res.status(500).json({
      message:
        "Unable to create maintenance record at the moment. Please try again later.",
    });
  }
};

// ✅ Get All Maintenance Records (Admin only)
exports.getAllMaintenance = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "You do not have permission to view maintenance records.",
      });
    }

    const records = await req.models.Maintenance.find().populate(
      "flatId",
      "flatNumber address",
    );

    res.json(records);
  } catch (err) {
    console.error("Fetch maintenance records error:", err);

    res.status(500).json({
      message:
        "Unable to fetch maintenance records right now. Please try again later.",
    });
  }
};

// ✅ Get Maintenance by Flat (Admin, Owner)
exports.getMaintenanceByFlat = async (req, res) => {
  try {
    const { flatId } = req.params;

    if (!flatId) {
      return res.status(400).json({
        message: "Flat ID is required.",
      });
    }

    const records = await req.models.Maintenance.find({ flatId }).populate(
      "flatId",
      "flatNumber address",
    );

    res.json(records);
  } catch (err) {
    console.error("Fetch flat maintenance error:", err);

    res.status(500).json({
      message:
        "Unable to fetch maintenance details for this flat. Please try again later.",
    });
  }
};

// ✅ Delete Maintenance Record (Admin only)
exports.deleteMaintenance = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { maintenanceId } = req.params;

    const record =
      await req.models.Maintenance.findByIdAndDelete(maintenanceId);
    if (!record)
      return res.status(404).json({ message: "Maintenance record not found" });

    await req.models.AuditLog.create({
      action: "delete",
      collection: "Maintenance",
      recordId: maintenanceId,
      userId: req.user.id,
      details: { deleted: true },
    });

    res.json({ message: "Maintenance record deleted" });
  } catch (err) {
    res.status(500).json({
      message: "Error deleting maintenance",
      error: err.message,
    });
  }
};

// ⭐ MERGED: Update Maintenance (Admin only — FULL update)
exports.updateMaintenance = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { maintenanceId } = req.params;
    const { flatId, amount, dueDate, notes, status } = req.body;

    const record = await req.models.Maintenance.findById(maintenanceId);
    if (!record) {
      return res.status(404).json({ message: "Maintenance record not found" });
    }

    if (flatId) record.flatId = flatId;
    if (amount) record.amount = amount;
    if (notes) record.notes = notes;

    if (dueDate) {
      const parsed = new Date(dueDate);
      record.dueDate = parsed;
      record.cycleYear = parsed.getFullYear();
      record.cycleMonth = parsed.getMonth() + 1;
    }

    const oldStatus = record.status;

    if (status && status !== oldStatus) {
      record.status = status;

      if (status === "paid" && !record.slipNumber) {
        const slipNumber = await generateSlipNumber(req);
        record.slipNumber = slipNumber;
        record.receiptGenerated = true;

        const flat = await req.models.Flat.findById(record.flatId).populate(
          "ownerId",
        );

        const ownerId = flat?.ownerId?._id;
        if (!ownerId) {
          return res
            .status(400)
            .json({ message: "Owner not found for this flat" });
        }

        const numberToWords = require("number-to-words");
        const amountWords =
          numberToWords
            .toWords(record.amount)
            .replace(/^\w/, (c) => c.toUpperCase()) + " only";

        await req.models.SlipRegistry.create({
          societyId: req.user.societyId,
          flatId: record.flatId,
          ownerId,
          maintenanceId: record._id,
          slipNumber,
          month: record.cycleMonth,
          year: record.cycleYear,
          amount: record.amount,
          amountWords,
        });

        /* ---------- Notify on payment ---------- */
        const usersToNotify = await getFlatUsers(req, record.flatId);
        if (usersToNotify.length) {
          await req.models.Notification.insertMany(
            usersToNotify.map((userId) => ({
              userId,
              type: "maintenance",
              title: "Maintenance payment updated",
              message: "Your maintenance has been marked as paid.",
              meta: { maintenanceId: record._id },
            })),
          );
        }
      }
    }

    await record.save();

    await req.models.AuditLog.create({
      action: "update",
      collection: "Maintenance",
      recordId: maintenanceId,
      userId: req.user.id,
      details: { updated: true },
    });

    res.json({ message: "Maintenance updated", record });
  } catch (err) {
    res.status(500).json({
      message: "Error updating maintenance",
      error: err.message,
    });
  }
};

// controllers/slipController.js
exports.getSlips = async (req, res) => {
  try {
    const { role, id, societyId } = req.user;
    const { SlipRegistry, Flat } = req.models;

    let filter = { societyId };

    // Owner → only slips for flats they own
    if (role === "owner") {
      const flats = await Flat.find({ ownerId: id }, "_id");
      const flatIds = flats.map((f) => f._id);
      filter.flatId = { $in: flatIds };
    }

    // Optional filters: month, year (admin + owner + tenant)
    const { month, year } = req.query;
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);

    const slips = await SlipRegistry.find(filter)
      .populate("flatId", "flatNumber")
      .populate("ownerId", "name")
      .populate("maintenanceId", "cycleMonth cycleYear amount");

    res.json({ count: slips.length, slips });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching slips",
      error: err.message,
    });
  }
};

// ✅ Get Maintenance Records (Role-based)
exports.getMaintenanceRecords = async (req, res) => {
  try {
    const { role, id } = req.user;

    let records;

    if (role === "admin") {
      // Admins see everything
      records = await req.models.Maintenance.find().populate(
        "flatId",
        "flatNumber address",
      );
    } else if (role === "owner") {
      // Owners see only their flats
      const flats = await req.models.Flat.find({ ownerId: id });
      const flatIds = flats.map((f) => f._id);
      records = await req.models.Maintenance.find({
        flatId: { $in: flatIds },
      }).populate("flatId", "flatNumber address");
    } else if (role === "tenant") {
      // Tenants see only their flat
      const flats = await req.models.Flat.find({ tenantId: id });
      const flatIds = flats.map((f) => f._id);
      records = await req.models.Maintenance.find({
        flatId: { $in: flatIds },
      }).populate("flatId", "flatNumber address");
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(records);
  } catch (err) {
    res.status(500).json({
      message: "Error fetching maintenance records",
      error: err.message,
    });
  }
};

exports.exportMaintenanceCSV = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const records = await req.models.Maintenance.find().populate({
      path: "flatId",
      select: "flatNumber ownerId",
      populate: { path: "ownerId", select: "name" },
    });

    // Prepare beautified data
    const data = records.map((r) => {
      const monthName = new Date(r.dueDate).toLocaleString("default", {
        month: "long",
      });

      return {
        "Flat Number": r.flatId.flatNumber,
        "Owner Name": r.flatId.ownerId?.name || "N/A",
        "Amount (₹)": r.amount,
        Month: monthName,
        Status: r.status === "paid" ? "Paid" : "Pending",
      };
    });

    // Fields must match beautified keys
    const fields = [
      "Flat Number",
      "Owner Name",
      "Amount (₹)",
      "Month",
      "Status",
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    res.header("Content-Type", "text/csv");
    res.attachment("maintenance_report.csv");
    return res.send(csv);
  } catch (err) {
    res.status(500).json({
      message: "Error exporting CSV",
      error: err.message,
    });
  }
};

exports.exportMaintenancePDF = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const records = await req.models.Maintenance.find().populate({
      path: "flatId",
      select: "flatNumber ownerId",
      populate: { path: "ownerId", select: "name" },
    });

    // Build beautified table rows
    const rowsHtml = records
      .map((r) => {
        const monthName = new Date(r.dueDate).toLocaleString("default", {
          month: "long",
        });

        // Status badge
        const statusHtml =
          r.status === "paid"
            ? `<span style="color:#0a7c0a; font-weight:600;">Paid</span>`
            : `<span style="color:#d97706; font-weight:600;">Pending</span>`;

        return `
        <tr>
          <td>${r.flatId.flatNumber}</td>
          <td>${r.flatId.ownerId?.name || "N/A"}</td>
          <td>₹${r.amount}</td>
          <td>${monthName}</td>
          <td>${statusHtml}</td>
        </tr>
      `;
      })
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 30px;
            background: #f9fafb;
          }

          .title {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            letter-spacing: 0.5px;
            color: #1f2937;
          }

          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
            background: white;
          }

          th {
            background-color: #f3f4f6;
            color: #374151;
            padding: 10px;
            font-size: 14px;
            font-weight: 600;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }

          td {
            padding: 10px;
            font-size: 14px;
            color: #374151;
            border-bottom: 1px solid #f0f0f0;
          }

          tr:nth-child(even) td {
            background-color: #fafafa;
          }

          tr:last-child td {
            border-bottom: none;
          }
        </style>
      </head>

      <body>
        <div class="title">Maintenance Report</div>

        <table>
          <thead>
            <tr>
              <th style="width: 80px;">Flat No</th>
              <th style="width: 180px;">Owner Name</th>
              <th style="width: 100px;">Amount</th>
              <th style="width: 120px;">Month</th>
              <th style="width: 100px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: "new",
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "30px", bottom: "30px" },
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=maintenance_report.pdf",
    );
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({
      message: "Error exporting PDF",
      error: err.message,
    });
  }
};

exports.generateMaintenanceSlip = async (req, res) => {
  try {
    const { maintenanceId } = req.params;

    // 1. Fetch maintenance record
    const record = await req.models.Maintenance.findById(
      maintenanceId,
    ).populate({
      path: "flatId",
      select: "flatNumber ownerId",
      populate: { path: "ownerId", select: "name" },
    });

    if (!record) {
      return res.status(404).json({ message: "Maintenance record not found" });
    }

    // 2. Only PAID records can download slip
    if (record.status !== "paid") {
      return res.status(400).json({
        message: "Slip can be downloaded only after payment.",
      });
    }

    // 3. Slip number must exist
    if (!record.slipNumber) {
      return res.status(400).json({
        message: "Slip has not been generated yet by the system.",
      });
    }

    // 4. DO NOT create SlipRegistry here
    //    Only download the PDF

    // Build HTML
    const monthName = new Date(record.dueDate).toLocaleString("default", {
      month: "long",
    });

    const numberToWords = require("number-to-words");
    const amountWords =
      numberToWords
        .toWords(record.amount)
        .replace(/^\w/, (c) => c.toUpperCase()) + " only";

    const html = `
    <!DOCTYPE html>
<html>
<head>
<style>
    body {
        font-family: Arial, sans-serif;
        font-size: 14px;
        width: 700px;
        margin: 20px auto;
        border: 1px solid #000;
        padding: 20px;
    }
    .title {
        text-align: center;
        font-size: 20px;
        font-weight: bold;
        text-transform: uppercase;
    }
    .sub {
        text-align: center;
        font-size: 12px;
        margin-top: 5px;
    }
    .row {
        display: flex;
        justify-content: space-between;
        margin-top: 15px;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
    }
    table, th, td {
        border: 1px solid #000;
    }
    th, td {
        padding: 5px;
        font-size: 14px;
    }
    .footer {
        margin-top: 30px;
    }
</style>
</head>
<body>

<div class="title">Sai Pooja Co-Op. Housing Society Ltd.</div>
<div class="sub">(Regd. N.B.O.M.CIDCO / HSG (T.C.) / 9632 / JTR / Year 2022-2023)<br>
Plot No. 24, Sector 3, Karanjade, Panvel-410 206, Navi Mumbai.</div>

<div class="row">
    <div>No. <b>${record.slipNumber}</b></div>
    <div><b>RECEIPT</b></div>
    <div>Date: <b>${new Date().toLocaleDateString()}</b>
</div>
</div>

<div style="margin-top: 15px;">

    Received with thanks from Mr./Mrs. <b>${
      record.flatId.ownerId?.name || "N/A"
    }</b><br>
    <div style="display:flex;justify-content:space-between;">
    <div>
    Flat No. <b>${
      record.flatId.flatNumber
    }</b></div> <div style="text-align: right;">
  Month <b>${monthName} ${record.cycleYear}</b>
</div>
</div>
</b>
</div>

<table>
    <tr>
        <th style="width: 50px;">Sr.<br>No.</th>
        <th>Particulars</th>
        <th colspan="2" style="width: 130px;">Amount</th>
    </tr>
    <tr>
    <th></th>
    <th></th>
    <th>Rs.</th>
    <th>Ps.</th>
  </tr>


    <tr><td>01.</td><td>Mainentance Charge / देखभाल शुल्क</td><td rowspan="15" style="vertical-align: top; text-align:right;">${
      record.amount
    }/-</td></tr>
    <tr><td>02.</td><td>Water Charges / पाणी पुरवठा वर्गणी</td></tr>
    <tr><td>03.</td><td>Service Charges / सेवा वर्गणी</td></tr>
    <tr><td>04.</td><td>Sinking Fund / आपत्कालीन निधी</td></tr>
    <tr><td>05.</td><td>Interest / Penalty / व्याज / दंड</td></tr>
    <tr><td>06.</td><td>Non-Occupancy Charges / गैरवस्ती सवलतीचे शुल्क</td></tr>
    <tr><td>07.</td><td>Transfer Charges / हस्तांतरण शुल्क</td></tr>
    <tr><td>08.</td><td>Tranfer Fee / हस्तांतरण फी</td></tr>
    <tr><td>09.</td><td>Entrance Fee / प्रवेश फी</td></tr>
    <tr><td>10.</td><td>Electric Charges / वीजपुरवठा शुल्क</td></tr>
    <tr><td>11.</td><td>Share Money / शेअर रक्कम</td></tr>
    <tr><td>12.</td><td>Development Fund / विकास निधी</td></tr>
    <tr><td>13.</td><td>Donation / देणगी</td></tr>
    <tr><td>14.</td><td>Parking Charges / पार्किंग वर्गणी</td></tr>
    <tr><td>15.</td><td>Other Charges / इतर शुल्क</td></tr>

    <tr>
        <th colspan="2" style="text-align: right;">TOTAL</th>
        <th style="text-align:right;">${record.amount}/-</th>
    </tr>
</table>

<div class="footer">
    Rupees: <b>${amountWords}</b>
    <br><br><br>
    <div style="text-align:right; margin-top:30px; display:flex; justify-content:space-between;">
        <b>Chairman / Secretary / Treasurer</b>
         <b>Receiver</b>
    </div>
</div>

</body>
</html>

    `;

    // Generate PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=slip_${record.slipNumber}.pdf`,
    );

    return res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({
      message: "Error generating slip",
      error: err.message,
    });
  }
};
