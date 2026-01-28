async function generateSlipNumber(req) {
  const { societyId } = req.user;
  const year = new Date().getFullYear();

  const counterDoc = await req.models.SlipCounter.findOneAndUpdate(
    { societyId, year },
    { $inc: { counter: 1 } },
    { new: true, upsert: true }
  );

  return `${year}-${String(counterDoc.counter).padStart(2, "0")}`;
}

module.exports = generateSlipNumber;
