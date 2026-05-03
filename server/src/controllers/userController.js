export const getCurrentUser = async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      _id: req.user._id,
      email: req.user.email,
      riskScore: req.user.riskScore,
      suspiciousLogin: req.user.suspiciousLogin,
    },
  });
};