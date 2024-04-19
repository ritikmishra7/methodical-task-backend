const Project = require("@models/project");

const hasPermission = (asked_permission) =>
{
	return (req, res, next) =>
	{
		const { projects } = req;
		const { project_id } = req.params;
		const responseObject = {};

		const availablePermission = projects[project_id].role[0];

		if (asked_permission.includes(availablePermission))
		{
			return next();
		}
		else
		{
			responseObject.code = 403;
			responseObject.message = "You are not authorized";

			return res.error(responseObject);
		}
	};
};

const attachProjectData = async (req, res, next) =>
{
	const projects = await Project.find({
		members: {
			$elemMatch: {
				user: req.user._id,
				status: "JOINED"
			}
		}
	}, { "_id": 1, "role": "$members.role", "key": 1, "name": 1 });

	const formattedProjects = {};

	projects.map(project =>
	{
		formattedProjects[project._doc._id] = project._doc;
	});

	req.projects = formattedProjects;
	return next();
};

const hasProjectAccess = (req, res, next) =>
{
	const { projects } = req;
	const { project_id } = req.params;

	if (projects[project_id])
	{
		return next();
	}

	const responseObject = {
		code: 403,
		message: "You are not a part of this project"
	};

	return res.error(responseObject);
};

module.exports =
{
	hasPermission, hasProjectAccess, attachProjectData
};
