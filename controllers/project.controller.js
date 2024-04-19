const asyncHandler = require("express-async-handler");
const Project = require("@models/project");
const User = require("@models/user");
const { sendNotificationToUser, sendPersonalChatNotification, sendProjectNotification } = require("@helpers/notification.helper");
const { sendChatMessageHelper } = require("@helpers/chat.helper");
const Chat = require("@models/chat");
const nodemailer = require("nodemailer");
// const { createCollabSession, joinCollabSession } = require("../helpers/collab.helper");
const { createCollabSession, joinCollabSession, leaveCollabSession } = require("../configs/socket");
const personalchat = require("../models/personalchat");
const chat_history = require("../models/chat_history");

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
			"role": "$members.role",
			"thumbnail": 1,
		}
	);

	let formattedProjects = records.map(r =>
	{
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

	const record = await Project.findOneAndUpdate(
		{ _id: project_id },
		payload,
		{ new: true }
	).populate("members.user", { "first_name": 1, "last_name": 1, "profile_picture": 1 });

	responseObject.message = "Successfully updated project details";
	responseObject.result = record;

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

	const { searchQuery } = req.query;
	const responseObject = {};

	let record = {};
	if (!searchQuery)
	{
		record = await Project.findOne({
			_id: project_id,
			"members.user": _id
		}).populate({ path: "members.user", select: { "_id": 1, "first_name": 1, "last_name": 1, "display_name": 1, "profile_picture": 1 } });
	}
	else
	{
		const regex = new RegExp(searchQuery, 'i');
		record = await Project.findOne({
			_id: project_id,
			"members.user": _id
		}).populate({
			path: "members.user",
			match: { display_name: { $regex: regex } },
			select: { "_id": 1, "first_name": 1, "last_name": 1, "display_name": 1, "profile_picture": 1 }
		});
	}

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

	const userToAdd = await User.findOne({ email: body.email.trim().toLowerCase() });

	if (!userToAdd)
	{
		responseObject.message = "Sorry this user doesn't exist. Please ask them to sign up first.";
		responseObject.code = 404;
		return res.error(responseObject);
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
					redirect_url: `/${req.user.display_name}/${project_id}/invitations`,
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
			initiator_profile: updatedProjectDetails.thumbnail,
			message: `${userDetails.display_name} now has ${body.role} access.`,
			is_actionable: false,
			redirect_url: `/project/${project_id}/members`
		},
		initiator: req.user._id
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

	if (!project_id)
	{
		responseObject.message = "Please provide a project id";
		responseObject.code = 400;
		return res.error(responseObject);
	}

	const body = req.body;
	let responseObject = {};

	const projectDetails = await Project.findOne({ _id: project_id, members: { $elemMatch: { user: _id } } });

	if (!projectDetails)
	{
		responseObject.message = "You are not a member of this project";
		responseObject.code = 400;
		return res.error(responseObject);
	}

	const userStatus = projectDetails.members.find(member => member.user.toString() === _id.toString()).status;
	if (userStatus !== "PENDING")
	{
		responseObject.message = "You have already taken an action on this invitation";
		responseObject.code = 400;
		return res.error(responseObject);
	}

	await Project.findOneAndUpdate(
		{ _id: project_id, 'members.user': _id },
		{ 'members.$.status': body.action },
		{ new: true }
	);

	if (body.action == "JOINED")
	{
		await sendProjectNotification({
			to: project_id,
			event: "new-notification",
			payload: {
				initiator_name: projectDetails.name,
				initiator_profile: projectDetails.thumbnail,
				message: `${req.user.display_name} has now joined`,
				is_actionable: false,
				redirect_url: `/project/${project_id}/members`
			},
			initiator: req.user._id
		});
	}

	responseObject.message = "Successfully updated your status";
	return res.success(responseObject);
});

exports.fetchInvitedProjectDetails = asyncHandler(async (req, res) =>
{
	const { _id } = req.user;
	const { project_id } = req.params;

	if (!project_id)
	{
		responseObject.message = "Please provide a project id";
		responseObject.code = 400;
		return res.error(responseObject);
	}

	const responseObject = {};

	const projectDetails = await Project.findOne({
		_id: project_id
	}).populate("members.user", { "first_name": 1, "last_name": 1, "profile_picture": 1, "display_name": 1, });

	if (!projectDetails)
	{
		responseObject.message = "You are not a invited to this project";
		responseObject.code = 400;
		return res.error(responseObject);
	}

	const userStatus = projectDetails.members.find(member => member.user._id.toString() === _id.toString()).status;
	const invitedRole = projectDetails.members.find(member => member.user._id.toString() === _id.toString()).role;
	if (userStatus !== "PENDING")
	{
		responseObject.message = "You have already taken an action on this invitation";
		responseObject.code = 400;
		return res.error(responseObject);
	}

	responseObject.message = "Successfully fetched project details";

	projectDetails.members = projectDetails.members.filter(member => member.status !== "PENDING");
	projectDetails.members = projectDetails.members.filter(member => member.user.toString() !== _id.toString());
	responseObject.result = {
		name: projectDetails.name,
		description: projectDetails.description,
		role: invitedRole,
		members: projectDetails.members.map(member => ({
			_id: member.user._id,
			display_name: member.user.display_name,
			first_name: member.user.first_name,
			last_name: member.user.last_name,
			profile_picture: member.user.profile_picture,
			role: member.role,
			status: member.status
		}))
	};

	return res.success(responseObject);
});

exports.fetchChatsForProject = asyncHandler(async (req, res) =>
{
	let responseObject = {};
	const { project_id } = req.params;
	const limit = req.query.limit || 10;
	const skip = req.query.skip || 0;

	if (!project_id)
	{
		responseObject.message = "Please provide a project id";
		responseObject.code = 400;
		return res.error(responseObject);
	}
	const { _id } = req.user;
	if (!_id)
	{
		responseObject.message = "Please provide a user id";
		responseObject.code = 400;
		return res.error(responseObject);
	}

	const messages = await Chat.getProjectMessages(project_id, parseInt(limit), parseInt(skip));

	responseObject.message = "Successfully fetched messages";
	responseObject.result = messages;
	responseObject.code = 200;
	return res.success(responseObject);
});

exports.sendChatMessage = asyncHandler(async (req, res) =>
{
	let responseObject = {};
	const { project_id } = req.params;

	if (!project_id)
	{
		responseObject.message = "Please provide a project id";
		responseObject.code = 400;
		return res.error(responseObject);
	}
	const { _id } = req.user;
	if (!_id)
	{
		responseObject.message = "Please provide a user id";
		responseObject.code = 400;
		return res.error(responseObject);
	}

	const { message, type, attachments, sent_at } = req.body;
	let DBresponse = {};
	if (type === 'TEXT')
	{
		DBresponse = await sendChatMessageHelper({
			to: project_id,
			event: 'chat-message',
			payload: {
				type: type,
				message,
				project: project_id,
				project_name: req.projects[project_id].name,
				sent_at: sent_at,
				sender: {
					_id: _id,
					display_name: req.user.display_name,
					profile_picture: req.user.profile_picture,
					email: req.user.email,
				}
			},
			initiator: _id,
			type: type
		});
	}
	else
	{
		DBresponse = await sendChatMessageHelper({
			to: project_id,
			event: 'chat-message',
			payload: {
				type: type,
				document: attachments,
				sent_at: sent_at,
				project: project_id,
				project_name: req.projects[project_id].name,
				sender: {
					_id: _id,
					display_name: req.user.display_name,
					profile_picture: req.user.profile_picture,
					email: req.user.email,
				}
			},
			initiator: _id,
			type: type
		});
	}
	responseObject.message = "Successfully sent message";
	responseObject.code = 200;
	responseObject.result = DBresponse;
	return res.success(responseObject);
});

exports.createOrJoinCollabSession = asyncHandler(async (req, res) =>
{

	const { collabId } = req.query;
	const responseObject = {};
	const { project_id } = req.params;
	if (!project_id)
	{
		responseObject.message = "Please provide a project id";
		responseObject.code = 400;
		return res.error(responseObject);
	}

	const { _id } = req.user;
	if (!_id)
	{
		responseObject.message = "Please provide a user id";
		responseObject.code = 400;
		return res.error(responseObject);
	}

	if (collabId)
	{
		//  Join an existing collab session
		const response = await joinCollabSession(collabId, req.user);
		if (response.success)
		{
			// response.user = req.user;
			// //remove encrypted password from user object
			// delete response.user.encrypted_password;
			response.user = {
				userId: req.user._id,
				display_name: req.user.display_name,
				profile_picture: req.user.profile_picture
			};
			responseObject.result = response;
			responseObject.code = 200;
			return res.success(responseObject);
		}
		else
		{
			responseObject.message = response.message;
			responseObject.code = 400;
			return res.error(responseObject);
		}
	}
	else
	{

		const response = await createCollabSession(req.user);
		response.user = {
			userId: req.user._id,
			display_name: req.user.display_name,
			profile_picture: req.user.profile_picture
		};

		responseObject.message = "Collab Session created successfully";
		responseObject.result = response;
		responseObject.code = 201;
		return res.success(responseObject);
	}
});

exports.leaveCollabSession = asyncHandler(async (req, res) =>
{
	const { collabId } = req.params;
	const responseObject = {};
	const { _id } = req.user;
	if (!collabId)
	{
		responseObject.message = "Please provide a collab session id";
		responseObject.code = 400;
		return res.error(responseObject);
	}

	const response = await leaveCollabSession(collabId, req.user);
	if (response.success)
	{
		responseObject.message = "Collab Session left successfully";
		responseObject.result = response;
		responseObject.code = 200;
		return res.success(responseObject);
	}
	else
	{
		responseObject.message = response.message;
		responseObject.code = 400;
		return res.error(responseObject);
	}

});

exports.inviteToCollab = asyncHandler(async (req, res) =>
{
	let responseObject = {};
	const { collabId, project_id } = req.params;

	const { usersToInvite } = req.body;
	const { _id } = req.user;
	if (!collabId)
	{
		responseObject.message = "Please provide a collab session id";
		responseObject.code = 400;
		return res.error(responseObject);
	}
	if (!usersToInvite)
	{
		responseObject.message = "Please provide a list of users to invite";
		responseObject.code = 400;
		return res.error(responseObject);
	}

	usersToInvite.forEach(async user =>
	{
		sendNotificationToUser({
			to: user._id,
			event: "new-notification",
			payload: {
				message: "You are invited to collab session",
				is_actionable: true,
				action_title: req.projects[project_id].name + " - Collab Session" || "Collab Session Invitation",
				redirect_url: `/project/${project_id}/collab/${collabId}`,
				initiator_name: req.user.display_name,
				initiator_profile: req.user.profile_picture
			}
		});
	});

	responseObject.message = "Successfully sent invites";
	responseObject.code = 200;
	return res.success(responseObject);

});

exports.fetchPersonalChatsForProject = asyncHandler(async (req, res) =>
{
	const responseObject = {};
	const { project_id } = req.params;

	if (!project_id)
	{
		responseObject.message = "Please provide a project id";
		responseObject.code = 400;
		return res.error(responseObject);
	}

	const chatHistory = await chat_history.find({
		project: project_id,
		$or: [
			{ sender: req.user._id },
			{ receiver: { $elemMatch: { $eq: req.user._id } } }
		]
	})
		.populate({
			path: "receiver",
			select: "display_name email profile_picture",
			model: "users",
			array: true
		})
		.populate("sender", "display_name email profile_picture")
		.populate("last_message");

	responseObject.message = "Successfully fetched personal chats";
	responseObject.result = chatHistory;

	return res.success(responseObject);
});


exports.fetchPersonalChatForProject = asyncHandler(async (req, res) =>
{
	const responseObject = {};
	const { chat_id } = req.params;

	if (!chat_id)
	{
		responseObject.message = "Please provide a chat id";
		responseObject.code = 400;
		return res.error(responseObject);
	}

	const personalChats = await personalchat.find({ chat_id })
		.populate({
			path: "receiver",
			select: "display_name email profile_picture",
			model: "users",
			array: true
		})
		.populate("sender", "display_name email profile_picture");


	responseObject.message = "Successfully fetched personal chats";
	responseObject.result = personalChats;

	return res.success(responseObject);
});

exports.sendPersonalChatMessage = asyncHandler(async (req, res) =>
{
	const { chat_id, project_id } = req.params;
	if (!chat_id)
	{
		responseObject.message = "Please provide a chat id";
		responseObject.code = 400;
		return res.error(responseObject);
	}
	const responseObject = {};

	const sender = req.user._id;
	const { type, receiver, message, attachments, sent_at } = req.body;

	const receivers = receiver;
	let record = {};
	if (type === 'TEXT')
	{
		receivers.forEach(async receiver =>
		{
			await sendPersonalChatNotification(
				{
					to: receiver,
					initiator: sender,
					payload: {
						type,
						message,
						sent_at,
						chat_id,
						sender: {
							_id: req.user._id,
							display_name: req.user.display_name,
							profile_picture: req.user.profile_picture,
							email: req.user.email,
							sent_at: sent_at
						}
					}
				}
			);
		});

		record = await personalchat.create({
			project: project_id,
			sender: sender,
			receiver: receivers,
			type: type,
			message: message,
			sent_at: sent_at,
			chat_id: chat_id
		});
	}
	else
	{
		receivers.forEach(async receiver =>
		{
			await sendPersonalChatNotification(
				{
					to: receiver,
					initiator: sender,
					payload: {
						type,
						message,
						sent_at,
						chat_id,
						document: attachments,
						sender: {
							_id: req.user._id,
							display_name: req.user.display_name,
							profile_picture: req.user.profile_picture,
							email: req.user.email,
							sent_at: sent_at
						}
					}
				}
			);
		});

		record = await personalchat.create({
			project: project_id,
			sender: sender,
			receiver: receivers,
			type: type,
			document: attachments,
			sent_at: sent_at,
			chat_id: chat_id
		});
	}


	await chat_history.findOneAndUpdate({ _id: chat_id }, { last_message: record._id });

	responseObject.message = "Successfully sent personal chat message";
	responseObject.result = record;

	return res.success(responseObject);
});

exports.createPersonalMessageEnitity = asyncHandler(async (req, res) =>
{
	const responseObject = {};
	const { project_id } = req.params;

	if (!project_id)
	{
		responseObject.message = "Please provide a project id";
		responseObject.code = 400;
		return res.error(responseObject);
	}

	const { receiver } = req.body;

	const members = [req.user._id.toString(), ...receiver];
	console.log(members);
	const payload = {
		project: project_id,
		sender: req.user._id,
		receiver: receiver,
		members: members
	};

	const alreadyExistingChatEntity = await chat_history.find({ project: project_id, members: { $all: members, $size: members.length } }).populate({
		path: "receiver",
		select: "display_name email profile_picture",
		model: "users",
		array: true
	}).populate("sender", "display_name email profile_picture");

	console.log('alreadyExistingChatEntity', alreadyExistingChatEntity);

	if (alreadyExistingChatEntity && alreadyExistingChatEntity.length > 1)
	{
		responseObject.message = "More Than One Chat Entity already exists";
		responseObject.code = 200;
		responseObject.result = alreadyExistingChatEntity[0];
		return res.success(responseObject);
	}
	else if (alreadyExistingChatEntity && alreadyExistingChatEntity.length === 1)
	{
		responseObject.message = "Chat Entity already exists";
		responseObject.code = 200;
		responseObject.result = alreadyExistingChatEntity[0];
		return res.success(responseObject);
	}

	const chatEntity = await chat_history.create(payload);
	const chatEntityPopulated = await chat_history.findOne({ _id: chatEntity._id }).populate({
		path: "receiver",
		select: "display_name email profile_picture",
		model: "users",
		array: true
	}).populate("sender", "display_name email profile_picture");
	responseObject.message = "Successfully created Direct Message Entity";
	responseObject.code = 201;
	responseObject.result = chatEntityPopulated;

	return res.success(responseObject);
});
