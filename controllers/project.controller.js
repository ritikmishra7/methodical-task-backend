const asyncHandler = require("express-async-handler");
const Project = require("@models/project");
const User = require("@models/user");
const { sendNotificationToUser } = require("@helpers/notification.helper");
const { getSocket, getSocketObject, getUserSocketInstance } = require("../configs/socket");
const { sendProjectNotification } = require("../helpers/notification.helper");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.EMAIL_ID,
		pass: process.env.EMAIL_PASSWORD
	}
});

exports.fetchProjectListForUser = asyncHandler(async (req, res) =>
{
	const { _id } = req.user;
	const responseObject = {};

	const { searchQuery } = req.query;
	const queryParameters = {
		status: 'ACTIVE',
		members: {
			$elemMatch: {
				user: _id,
				status: 'JOINED'
			}
		}
	};

	if (searchQuery)
	{
		const regex = new RegExp(searchQuery, 'i');
		queryParameters.name = { $regex: regex };
	}

	const records = await Project.find(
		queryParameters,
		{
			"_id": 1,
			"name": 1,
			"role": "$members.role"
		}
	);

	const Socket = getUserSocketInstance(_id);
	let formattedProjects = records.map(r =>
	{
		Socket.on("connection", () =>
		{
			Socket.join(r._doc._id);
		});
		return {
			...r._doc,
			role: r._doc.role[0]
		};
	});

	responseObject.message = "Successfully pulled all projects";
	responseObject.result = formattedProjects || [];

	return res.success(responseObject);
});

exports.createNewProject = asyncHandler(async (req, res) =>
{
	const { _id } = req.user;
	const body = req.body;
	const responseObject = {};

	body.members = [
		{
			user: _id,
			role: "OWNER",
			status: "JOINED"
		}
	];

	body.type = body.type.toUpperCase();

	const response = await Project.create(body);
	responseObject.result = {
		name: response.name,
		_id: response._id,
		role: response.members[0].role || "OWNER"
	};

	responseObject.message = "Successfully added a new project";
	return res.success(responseObject);
});

exports.fetchProjectDetails = asyncHandler(async (req, res) =>
{
	const { project_id } = req.params;
	const responseObject = {};

	const record = await Project.findOne({
		_id: project_id
	}).populate("members.user", { "first_name": 1, "last_name": 1, "profile_picture": 1 });

	responseObject.message = "Successfully fetched project details";
	responseObject.result = record;

	return res.success(responseObject);
});

exports.updateProjectDetails = asyncHandler(async (req, res) =>
{
	const { _id } = req.user;
	const { project_id } = req.params;
	const responseObject = {};

	const payload = req.body;

	payload.type = payload.type.toUpperCase();

	await Project.findOneAndUpdate(
		{ _id: project_id },
		payload
	);

	responseObject.message = "Successfully updated project details";

	return res.success(responseObject);
});

exports.deleteProject = asyncHandler(async (req, res) =>
{
	const { project_id } = req.params;
	const responseObject = {};

	await Project.findOneAndUpdate({ _id: project_id }, { status: "DELETED" });

	responseObject.message = "Successfully deleted project";

	return res.success(responseObject);
});

exports.fetchProjectMembers = asyncHandler(async (req, res) =>
{
	const { _id } = req.user;
	const { project_id } = req.params;
	const responseObject = {};

	const record = await Project.findOne({
		_id: project_id,
		"members.user": _id
	}).populate({ path: "members.user", select: { "_id": 1, "first_name": 1, "last_name": 1, "display_name": 1, "profile_picture": 1 } });


	responseObject.message = "Successfully fetched member details";
	responseObject.result = record.members;

	return res.success(responseObject);
});

exports.addMemberToProject = asyncHandler(async (req, res) =>
{
	const { project_id } = req.params;
	const responseObject = {};
	const body = req.body;
	const projectDetails = req.projects[project_id];

	const userToAdd = await User.findOne({ email: body.email.trim() });

	if (!userToAdd)
	{
		responseObject.message = "Sorry this user doesn't exists";
		responseObject.code = 404;
	}

	const isAlreadyMember = await Project.findOne({ _id: project_id, "members.user": userToAdd._id });

	if (isAlreadyMember)
	{
		responseObject.message = "User is already a member of this project";
		responseObject.code = 400;
		return res.error(responseObject);
	}

	await Project.findByIdAndUpdate(
		{ _id: project_id },
		{ $push: { members: { user: userToAdd._id, role: body.role || "READ" } } }
	);

	let origin = 'http://localhost:3000';
	if (process.env.NODE_ENV === 'production')
	{
		origin = process.env.CORS_ORIGIN;
	}

	const redirect_url = `${origin}/${req.user.display_name}/${project_id}/invitations`;
	const message = `You are invited to collaborate on ${projectDetails.name}. Please click on the link below to take an action.\n\n ${redirect_url}`;

	const mailOptions = {
		from: process.env.EMAIL_ID,
		to: body.email.trim(),
		subject: "You are invited to collaborate",
		text: message
	};

	transporter.sendMail(mailOptions, async (error, info) =>
	{
		if (error)
		{
			responseObject.code = 500;
			responseObject.message = "Error sending invitation";
			return res.error(responseObject);
		}
		else
		{
			await sendNotificationToUser({
				to: userToAdd._id,
				event: "new-notification",
				payload: {
					message: "You are invited to collaborate",
					is_actionable: true,
					action_title: req.projects[project_id].name + " - " + body.role || "READ",
					redirect_url: `/project-invite/${project_id}`,
					initiator_name: req.user.display_name,
					initiator_profile: req.user.profile_picture
				}
			});

			responseObject.message = "Successfully sent invite to user";
			return res.success(responseObject);
		}
	});
});

exports.removeMemberFromProject = asyncHandler(async (req, res) =>
{
	const { project_id, user_id } = req.params;
	const responseObject = {};

	await Project.findByIdAndUpdate(
		{ _id: project_id },
		{ $pull: { members: { user: user_id } } },
		{ new: true }
	);

	responseObject.message = "Successfully removed member from project";

	return res.success(responseObject);
});

exports.updateProjectMemberDetails = asyncHandler(async (req, res) =>
{
	const { project_id, user_id } = req.params;
	const body = req.body;
	const responseObject = {};

	const updatedProjectDetails = await Project.findOneAndUpdate(
		{ _id: project_id, 'members.user': user_id },
		{ 'members.$.role': body.role },
		{ new: true }
	);

	const userDetails = await User.findById(user_id);

	await sendProjectNotification({
		to: project_id,
		event: "new-notification",
		payload: {
			initiator_name: updatedProjectDetails.name,
			message: `${userDetails.display_name} now has ${body.role} access.`,
			is_actionable: false,
			redirect_url: `/projects/${project_id}/members`
		}
	});

	responseObject.message = "Successfully updated member's permission";

	return res.success(responseObject);
});

exports.fetchSearchedProjects = asyncHandler(async (req, res) =>
{
	try
	{
		const { _id } = req.user;
		const { searchQuery } = req.params;
		const responseObject = {};

		if (!searchQuery)
		{
			responseObject.message = "Please provide a search query";
			return res.error(responseObject);
		}

		const regex = new RegExp(searchQuery, 'i');
		const matchedProjects = await Project.find({ name: { $regex: regex }, members: { $elemMatch: { user: _id } } })
			.populate({ path: 'members.user', match: { _id: _id }, select: 'display_name email' });

		const mappedResults = matchedProjects.map(project =>
		{
			const _id = project._doc._id;
			const name = project._doc.name;
			const role = project._doc.members[0].role;
			return {
				_id,
				name,
				role
			};
		});
		responseObject.message = "Successfully fetched searched projects";
		responseObject.result = mappedResults;
		return res.success(responseObject);
	} catch (error)
	{
		console.log(error);
		return res.error(error);
	}

});

exports.invitationAction = asyncHandler(async (req, res) =>
{
	const { _id } = req.user;
	const { project_id } = req.params;
	const body = req.body;
	let responseObject = {};

	await Project.findOneAndUpdate(
		{ _id: project_id, 'members.user': _id },
		{ 'members.$.status': body.action }
	);

	responseObject.message = "Successfully updated your status";
	return res.success(responseObject);
});
