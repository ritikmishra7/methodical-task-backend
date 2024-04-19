const asyncHandler = require("express-async-handler");
const Task = require("@models/task");
const Counter = require("@models/counter");
const { sendNotificationToUser } = require("@helpers/notification.helper");

exports.fetchTasksForProject = asyncHandler(async (req, res) =>
{
	const { project_id } = req.params;
	const responseObject = {};

	const tasks = await Task.find({ project: project_id });

	responseObject.message = "Successfully fetched all tasks";
	responseObject.result = tasks;

	return res.success(responseObject);
});

exports.fetchTaskDetails = asyncHandler(async (req, res) =>
{
	const { project_id, task_key } = req.params;
	const responseObject = {};

	const taskDetails = await Task.findOne({ project: project_id, task_key: task_key });

	responseObject.message = "Successfully fetched task details";
	responseObject.result = taskDetails;

	return res.success(responseObject);
});

exports.addTasktoProject = asyncHandler(async (req, res) =>
{
	const { _id } = req.user;
	const { project_id } = req.params;
	const { key } = req.projects[project_id];
	const body = req.body;
	const responseObject = {};

	const counter = await Counter.findOneAndUpdate(
		{ _id: project_id },
		{ $inc: { count: 1 } },
		{ new: true, upsert: true }
	);



	// if (body.type == "SUB_TASK")
	// {
	// 	const parentTaskDetails = await Task.findOne({
	// 		key: body.parent_task_key
	// 	});

	// 	body.parent_task = parentTaskDetails._id;
	// }

	body.task_key = key + "-" + counter.count;
	body.reporter = _id;

	const payload = {
		...body,
		project: project_id
	};

	const record = await Task.create(payload);

	await sendNotificationToUser({
		to: record.assignee,
		event: "new-notification",
		payload: {
			message: `Assigned you a new task ${record.task_key}`,
			is_actionable: false,
			redirect_url: `/project/${project_id}/tasks/${record.task_key}`,
			initiator_name: req.user.display_name,
			initiator_profile: req.user.profile_picture
		}
	});

	responseObject.message = "Successfully created a new task";
	return res.success(responseObject);
});

exports.updateTaskDetails = asyncHandler(async (req, res) =>
{
	const { project_id, task_key } = req.params;
	const body = req.body;
	const responseObject = {};

	const oldValue = await Task.findOne({
		project: project_id, task_key: task_key
	});

	const record = await Task.findOneAndUpdate(
		{ project: project_id, task_key: task_key },
		body,
		{ new: true }
	);

	let message = "";
	let userToSendNotification = oldValue.assignee;

	if (oldValue.assignee.toString() !== record.assignee.toString())
	{
		userToSendNotification = record.assignee;
		message = `Assigned you a new task ${task_key}`;
	}
	else if (body.status !== undefined)
	{
		message = `Changed ${task_key} to ${body.status}`;
	}
	else
	{
		message = `Updated ${task_key} task details`;
	}

	await sendNotificationToUser({
		to: userToSendNotification,
		event: "new-notification",
		payload: {
			message,
			is_actionable: false,
			redirect_url: `/project/${project_id}/tasks/${task_key}`,
			initiator_name: req.user.display_name,
			initiator_profile: req.user.profile_picture
		}
	});

	responseObject.message = "Successfully update task";
	responseObject.result = record;

	return res.success(responseObject);
});

exports.fetchSubTasksForTask = asyncHandler(async (req, res) =>
{
	let { project_id, parent_task } = req.params;
	const responseObject = {};
	if (!project_id || !parent_task)
	{
		responseObject.code = 400;
		responseObject.message = "Bad Request";

		return res.error(responseObject);
	}

	const record = await Task.find({
		project: project_id,
		type: "SUB_TASK",
		parent_task: parent_task
	});

	if (!record)
	{
		responseObject.code = 404;
		responseObject.message = "No sub tasks found";

		return res.error(responseObject);
	}

	responseObject.message = "Successfully fetched sub tasks";
	responseObject.result = record;

	return res.success(responseObject);
});
