const express = require("express");
const router = express.Router();
const { login, register, logout, refreshAccessToken, forgotPassword, resetPassword, validateResetPasswordToken } = require("@controllers/auth.controller");

router.route(`/login`).post(login);
router.route(`/register`).post(register);
router.route(`/logout`).get(logout);
router.route('/refresh').get(refreshAccessToken);
router.route('/forgotPassword').post(forgotPassword);
router.route('/resetPassword').post(resetPassword);
router.route('/resetPassword/:userId/:resetToken').get(validateResetPasswordToken);

module.exports = router;
