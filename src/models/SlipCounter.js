const mongoose = require("mongoose");

const SlipCounterSchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Society",
    required: true,
  },
  year: { type: Number, required: true },
  counter: { type: Number, default: 0 },
});

SlipCounterSchema.index({ societyId: 1, year: 1 }, { unique: true });

module.exports = SlipCounterSchema;
