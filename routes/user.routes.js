const express = require("express");
const router = express.Router();
const { attachProjectData } = require("@middlewares/authorization.middleware");
const { fetchUserDetails, updateUserDetails, updateUserProfilePicture, fetchUserNotifications, markNotificationRead, markAllNotificationsRead } = require("@controllers/user.controller");

router.route(`/`).get(fetchUserDetails);
router.route(`/`).put(updateUserDetails);
router.route(`/`).patch(updateUserProfilePicture);
router.route(`/notifications`).get(attachProjectData, fetchUserNotifications);
router.route(`/notifications/mark-all`).patch(attachProjectData, markAllNotificationsRead);
router.route(`/notifications/:notification_id`).patch(attachProjectData, markNotificationRead);
module.exports = router;
