const asyncHandler = require("express-async-handler");
const User = require("@models/user");
const Notification = require("@models/notification");

exports.fetchUserDetails = asyncHandler(async (req, res) =>
{
	const { _id } = req.user;
	const user = await User.findById(_id).select("-salt -encrypted_password");
	const responseObject = {
		message: "Successfully fetched user details",
		result: user
	};

	return res.success(responseObject);
});

exports.updateUserDetails = asyncHandler(async (req, res) =>
{
	let responseObject = {};
	const { _id } = req.user;
	const { email, first_name, last_name, display_name } = req.body;

	if (!email || !first_name || !last_name || !display_name) 
	{
		responseObject.message = "All fields are required";
		return res.error(responseObject);
	}

	const user = await User.findById(_id);
	user.email = email;
	user.first_name = first_name;
	user.last_name = last_name;
	user.display_name = display_name;
	await user.save();

	responseObject = {
		message: "Successfully updated user details",
		result: user
	};

	return res.success(responseObject);
});

exports.updateUserProfilePicture = asyncHandler(async (req, res) =>
{
	let responseObject = {};
	const { _id } = req.user;
	const { profile_picture } = req.body;

	if (!profile_picture)
	{
		responseObject.message = "Profile picture is required";
		return res.error(responseObject);
	}

	const user = await User.findById(_id);
	user.profile_picture = profile_picture;
	await user.save();

	responseObject = {
		message: "Successfully updated user profile picture",
		result: user
	};

	return res.success(responseObject);
});

exports.fetchUserNotifications = asyncHandler(async (req, res) =>
{
	const { _id } = req.user;
	let responseObject = {};

	const projectIds = Object.keys(req.projects);
	let notifications = await Notification.find({ $or: [{ user: _id }, { project: { $in: projectIds } }] }).sort({ created_at: -1 });
	const unReadCount = await Notification.count({ $or: [{ user: _id }, { project: { $in: projectIds } }], [`is_read.${_id}`]: { $exists: false } });

	notifications = notifications.map(notification =>
	{
		return {
			...notification._doc,
			is_read: notification.is_read.get(_id) == true ? true : false
		};
	});
	responseObject.message = "Notifications fetched";
	responseObject.result = {
		notifications,
		unReadCount
	};

	return res.success(responseObject);
});

exports.markAllNotificationsRead = asyncHandler(async (req, res) =>
{
	const { _id } = req.user;
	let responseObject = {};

	const projectIds = Object.keys(req.projects);

	await Notification.updateMany({ $or: [{ user: _id }, { project: { $in: projectIds } }], [`is_read.${_id}`]: { $exists: false } }, { $set: { [`is_read.${_id}`]: true } }, { multi: true });
	responseObject.message = "Successfully marked all notifications as read";
	return res.success(responseObject);
});


exports.markNotificationRead = asyncHandler(async (req, res) =>
{
	const { _id } = req.user;
	const { notification_id } = req.params;
	let responseObject = {};

	const notification = await Notification.findById(notification_id);
	if (!notification)
	{
		responseObject.message = "Notification not found";
		responseObject.code = 404;
		return res.error(responseObject);
	}
	if (notification.type === "USER" && notification.user.toString() !== _id.toString())
	{
		responseObject.message = "You are not authorized to mark this notification as read";
		responseObject.code = 403;
		return res.error(responseObject);
	}

	if (notification.type === "PROJECT" && !req.projects[notification.project.toString()])
	{
		responseObject.message = "You are not authorized to mark this notification as read";
		responseObject.code = 403;
		return res.error(responseObject);
	}


	notification.is_read.set(`${_id}`, true);
	await notification.save();

	responseObject.message = "Successfully marked notification as read";
	return res.success(responseObject);
});
