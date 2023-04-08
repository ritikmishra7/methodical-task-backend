const asyncHandler = require("express-async-handler");
const Task = require("@models/task");
const Counter = require("@models/counter");

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

	if (body.type == "MAIN_TASK")
	{
		const counter = await Counter.findOneAndUpdate(
			{ _id: 'tasks' },
			{ $inc: { count: 1 } },
			{ new: true, upsert: true }
		);

		body.task_key = key + "-" + counter.count;
	}

	body.reporter = _id;

	const payload = {
		...body,
		project: project_id
	};

	const record = await Task.create(payload);

	responseObject.message = "Successfully created a new task";
	return res.success(responseObject);
});

exports.updateTaskDetails = asyncHandler(async (req, res) =>
{
	const { project_id, task_key } = req.params;
	const body = req.body;
	const responseObject = {};

	const record = await Task.findOneAndUpdate(
		{ project: project_id, task_key: task_key },
		body,
		{ new: true }
	);

	responseObject.message = "Successfully update task";
	responseObject.result = record;

	return res.success(responseObject);
	// if (body.type == "SUB_TASK")
	// {
	// 	const counter = await Counter.findOneAndUpdate(
	// 		{ _id: 'tasks' },
	// 		{ $inc: { count: 1 } },
	// 		{ new: true, upsert: true }
	// 	);

	// 	body.task_key = key + "-" + counter.count;
	// }
});
