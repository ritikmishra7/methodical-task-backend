const express = require("express");
const router = express.Router();
const { attachProjectData } = require("@middlewares/authorization.middleware");
const { fetchUserDetails, updateUserDetails, updateUserProfilePicture, fetchUserNotifications } = require("@controllers/user.controller");

router.route(`/`).get(fetchUserDetails);
router.route(`/`).put(updateUserDetails);
router.route(`/`).patch(updateUserProfilePicture);
router.route(`/notifications`).get(attachProjectData, fetchUserNotifications);
module.exports = router;
