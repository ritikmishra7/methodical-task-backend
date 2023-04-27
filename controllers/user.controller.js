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
	const { skip = 0, limit = 15 } = req.query;
	let responseObject = {};

	const projectIds = Object.keys(req.projects);
	const notifications = await Notification.find({ $or: [{ user: _id }, { project: { $in: projectIds } }] }).sort({ created_at: -1 }).skip(skip).limit(limit);
	const unReadCount = await Notification.count({ $or: [{ user: _id }, { project: { $in: projectIds } }], is_read: false });

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

	await Notification.findAndUpdate({ user: _id, is_read: false }, { is_read: true });

	responseObject.message = "Successfully marked all notifications as read";
	return res.success(responseObject);
});
