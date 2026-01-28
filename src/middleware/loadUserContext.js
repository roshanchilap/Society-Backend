// middleware/loadUserContext.js
exports.loadUserContext = async (req, res, next) => {
  try {
    if (!req.user?.id) return next();

    const user = await req.models.User.findById(req.user.id).select(
      "_id role flatId societyId isActive",
    );

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "User is inactive" });
    }

    // enrich req.user
    req.user.flatId = user.flatId || null;
    req.user.societyId = user.societyId || req.user.societyId;

    next();
  } catch (err) {
    console.error("loadUserContext error:", err);
    return res.status(500).json({ message: "Failed to load user context" });
  }
};
