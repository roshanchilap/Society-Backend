// controllers/reportController.js
exports.getMonthlyMaintenanceReport = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { month, year } = req.query; // e.g. ?month=1&year=2026

    // First day and last day of month
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const records = await req.models.Maintenance.find({
      dueDate: { $gte: start, $lte: end },
    });

    const total = records.reduce((sum, r) => sum + r.amount, 0);
    const collected = records
      .filter((r) => r.status === "paid")
      .reduce((sum, r) => sum + r.amount, 0);
    const pending = total - collected;

    res.json({
      month,
      year,
      total,
      collected,
      pending,
      records,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error generating report", error: err.message });
  }
};
